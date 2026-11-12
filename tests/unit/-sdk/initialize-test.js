import { module, test } from 'qunit';
import { waitUntil } from '@ember/test-helpers';

import {
  bootstrapLoader,
  initialize,
  shouldUpdateFlag,
  subscribeToClient,
} from 'ember-launch-darkly/-sdk/initialize';
import Context, {
  getCurrentContext,
  removeCurrentContext,
  setCurrentContext,
} from 'ember-launch-darkly/-sdk/context';

// Answers the SDK's flag request with `payload` and accepts everything else.
function fakeXHR(payload) {
  return class {
    withCredentials = false;
    #listeners = {};

    open(method, url) {
      this.method = method;
      this.url = url;
    }

    setRequestHeader() {}

    addEventListener(type, listener) {
      this.#listeners[type] = listener;
    }

    getResponseHeader(name) {
      return name.toLowerCase() === 'content-type' ? 'application/json' : null;
    }

    send() {
      const isFlagRequest = this.method === 'GET' && this.url.includes('/eval');

      this.status = isFlagRequest ? 200 : 202;
      this.responseText = isFlagRequest ? JSON.stringify(payload) : '';
      setTimeout(() => this.#listeners.load?.());
    }

    abort() {}
  };
}

// Opens straight away and sends `payload` as the stream's first put.
function fakeEventSource(payload) {
  return class {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 2;

    readyState = 0;
    #listeners = {};

    constructor() {
      setTimeout(() => {
        this.readyState = 1;
        this.onopen?.();
        this.#listeners.put?.({ data: JSON.stringify(payload) });
      });
    }

    addEventListener(type, listener) {
      this.#listeners[type] = listener;
    }

    close() {
      this.readyState = 2;
    }
  };
}

function fakeClient(flags = {}) {
  const handlers = {};

  return {
    flags,
    on(event, handler) {
      (handlers[event] ??= []).push(handler);
    },
    emit(event, ...args) {
      (handlers[event] ?? []).forEach((handler) => handler(...args));
    },
    allFlags() {
      return { ...this.flags };
    },
  };
}

module('Unit | SDK | Initialize', function () {
  module('#shouldUpdateFlag', function () {
    test('it works', async function (assert) {
      assert.false(shouldUpdateFlag('foo'), 'Config not provided');
      assert.false(shouldUpdateFlag('foo', {}), 'Empty object provided');

      assert.false(shouldUpdateFlag('foo', false), 'Stream no flags');
      assert.false(
        shouldUpdateFlag('foo', { allExcept: ['foo'] }),
        'Stream all flags except this flag',
      );
      assert.false(
        shouldUpdateFlag('foo', { foo: false }),
        'Specifically do not stream this flag',
      );
      assert.false(
        shouldUpdateFlag('foo', { foo: 666 }),
        'Invalid value for specific flag',
      );
      assert.false(
        shouldUpdateFlag('foo', { allExcept: true }),
        'Invalid value for allExcept',
      );

      assert.true(shouldUpdateFlag('foo', true), 'Stream all flags');
      assert.true(
        shouldUpdateFlag('foo', { allExcept: ['bar'] }),
        'Stream all flags except another flag',
      );
      assert.true(
        shouldUpdateFlag('foo', { foo: true }),
        'Specifically stream this flag',
      );
    });
  });

  module('#initialize', function (hooks) {
    hooks.afterEach(function () {
      removeCurrentContext();
    });

    test('local mode returns isOk with status "local"', async function (assert) {
      const result = await initialize(
        'test-client-id',
        {},
        {
          mode: 'local',
          localFlags: { 'my-flag': true },
        },
      );

      const context = getCurrentContext();

      assert.ok(context, 'context was created');
      assert.true(context.get('my-flag'), 'flag value is set');

      assert.true(result.isOk, 'result.isOk is true');
      assert.strictEqual(result.status, 'local', 'result.status is "local"');
      assert.strictEqual(result.error, undefined, 'result.error is undefined');
      assert.strictEqual(
        result.context,
        context,
        'result.context is the created context',
      );

      assert.strictEqual(
        context.initStatus,
        'local',
        'context.initStatus is "local"',
      );
      assert.true(context.initSucceeded, 'context.initSucceeded is true');
      assert.strictEqual(
        context.initError,
        undefined,
        'context.initError is undefined',
      );
    });

    test('remote mode failure returns isOk false with status "failed"', async function (assert) {
      const result = await initialize(
        'invalid-client-id',
        {},
        {
          mode: 'remote',
          timeout: 1,
        },
      );

      const context = getCurrentContext();

      assert.ok(context, 'context was created despite init failure');
      assert.false(result.isOk, 'result.isOk is false');
      assert.strictEqual(result.status, 'failed', 'result.status is "failed"');
      assert.ok(result.error, 'result.error contains the error');
      assert.ok(result.context, 'result.context is returned even on failure');

      assert.strictEqual(
        context.initStatus,
        'failed',
        'context.initStatus is "failed"',
      );
      assert.false(context.initSucceeded, 'context.initSucceeded is false');
      assert.ok(context.initError, 'context.initError contains the error');
    });

    test('remote mode loads LaunchDarkly values after a localStorage bootstrap', async function (assert) {
      const user = { key: 'user' };
      const cacheKey = `ld:test-client-id:${btoa(JSON.stringify(user))}`;
      const realXHR = window.XMLHttpRequest;

      window.localStorage.setItem(
        cacheKey,
        JSON.stringify({ 'my-flag': 'cached' }),
      );
      window.XMLHttpRequest = fakeXHR({
        'my-flag': { value: 'live', variation: 1, version: 2 },
      });

      try {
        let inspected = 0;
        const { isOk, context } = await initialize('test-client-id', user, {
          mode: 'remote',
          bootstrap: 'localStorage',
          streaming: false,
          sendEvents: false,
          diagnosticOptOut: true,
          fetchGoals: false,
          inspectors: [
            {
              type: 'flag-details-changed',
              name: 'app',
              method: () => inspected++,
            },
          ],
        });

        assert.true(isOk);
        assert.strictEqual(
          context.get('my-flag'),
          'cached',
          'starts from the cache',
        );

        await waitUntil(() => context.get('my-flag') === 'live');

        assert.strictEqual(context.get('my-flag'), 'live', 'then LaunchDarkly');
        assert.ok(inspected, "the app's own inspector still runs");

        await context.destroy({ force: true });
      } finally {
        window.XMLHttpRequest = realXHR;
        window.localStorage.removeItem(cacheKey);
      }
    });

    test('remote mode loads LaunchDarkly values after a localFlags bootstrap', async function (assert) {
      const realEventSource = window.EventSource;

      window.EventSource = fakeEventSource({
        'my-flag': { value: 'live', variation: 1, version: 2 },
      });

      try {
        const { isOk, context } = await initialize(
          'test-client-id',
          { key: 'user' },
          {
            mode: 'remote',
            bootstrap: 'localFlags',
            localFlags: { 'my-flag': 'local' },
            sendEvents: false,
            diagnosticOptOut: true,
            fetchGoals: false,
          },
        );

        assert.true(isOk);
        assert.strictEqual(
          context.get('my-flag'),
          'local',
          'starts from localFlags',
        );

        await waitUntil(() => context.get('my-flag') === 'live');

        assert.strictEqual(context.get('my-flag'), 'live', 'then LaunchDarkly');

        await context.destroy({ force: true });
      } finally {
        window.EventSource = realEventSource;
      }
    });

    test('re-initialization returns result from existing context', async function (assert) {
      await initialize(
        'test-client-id',
        {},
        {
          mode: 'local',
          localFlags: { 'my-flag': true },
        },
      );

      const result = await initialize(
        'test-client-id',
        {},
        {
          mode: 'local',
          localFlags: { 'my-flag': true },
        },
      );

      assert.true(result.isOk, 'result.isOk reflects existing context state');
      assert.strictEqual(
        result.status,
        'local',
        'result.status reflects existing context state',
      );
    });

    test('onStatusChange callback is stored on the context', async function (assert) {
      assert.expect(2);

      const statusChanges = [];

      await initialize(
        'test-client-id',
        {},
        {
          mode: 'local',
          localFlags: { flag: true },
          onStatusChange(newStatus, previousStatus) {
            statusChanges.push({ newStatus, previousStatus });
          },
        },
      );

      const context = getCurrentContext();

      // Manually trigger a status transition to verify the callback fires
      context.transitionStatus('failed', new Error('test'));

      assert.strictEqual(statusChanges.length, 1, 'callback fired once');
      assert.deepEqual(
        statusChanges[0],
        { newStatus: 'failed', previousStatus: 'local' },
        'callback received correct arguments',
      );
    });

    test('transitionStatus does not fire callback when status is unchanged', async function (assert) {
      const statusChanges = [];

      await initialize(
        'test-client-id',
        {},
        {
          mode: 'local',
          localFlags: { flag: true },
          onStatusChange(newStatus, previousStatus) {
            statusChanges.push({ newStatus, previousStatus });
          },
        },
      );

      const context = getCurrentContext();

      // Transition to the same status — should be a no-op
      context.transitionStatus('local');

      assert.strictEqual(
        statusChanges.length,
        0,
        'callback did not fire for same-status transition',
      );
    });

    test('onError callback is stored on the context', async function (assert) {
      const errors = [];

      await initialize(
        'test-client-id',
        {},
        {
          mode: 'local',
          localFlags: { flag: true },
          onError(error) {
            errors.push(error);
          },
        },
      );

      const context = getCurrentContext();
      const err = new Error('test runtime error');
      context.handleError(err);

      assert.strictEqual(errors.length, 1, 'onError callback fired');
      assert.strictEqual(errors[0], err, 'received the error');
      assert.strictEqual(context.lastError, err, 'lastError is set on context');
    });
  });

  module('#subscribeToClient', function (hooks) {
    hooks.afterEach(function () {
      removeCurrentContext();
      window.localStorage.removeItem('ember-launch-darkly');
    });

    test('recovers when initialization completes after the timeout', async function (assert) {
      const statusChanges = [];
      const client = fakeClient();
      const context = new Context({
        client,
        initStatus: 'failed',
        initError: new Error('timeout'),
        onStatusChange(newStatus, previousStatus) {
          statusChanges.push([newStatus, previousStatus]);
        },
      });

      setCurrentContext(context);
      subscribeToClient(client, context, false);

      client.flags = { 'my-flag': true, 'other-flag': 'b' };
      client.emit('initialized');

      assert.strictEqual(context.initStatus, 'initialized');
      assert.true(context.get('my-flag'));
      assert.strictEqual(context.get('other-flag'), 'b');
      assert.deepEqual(statusChanges, [['initialized', 'failed']]);
    });

    test('leaves a destroyed or replaced context alone', async function (assert) {
      const statusChanges = [];
      const client = fakeClient();
      const context = new Context({
        client,
        initStatus: 'failed',
        onStatusChange(newStatus, previousStatus) {
          statusChanges.push([newStatus, previousStatus]);
        },
      });

      setCurrentContext(context);
      subscribeToClient(client, context, false);
      setCurrentContext(new Context({ flags: { 'my-flag': false } }));

      client.flags = { 'my-flag': true };
      client.emit('initialized');

      assert.strictEqual(context.initStatus, 'failed');
      assert.strictEqual(context.get('my-flag'), undefined);
      assert.deepEqual(statusChanges, []);
    });

    test('keeps persisted flags on recovery, like a successful init', async function (assert) {
      window.localStorage.setItem(
        'ember-launch-darkly',
        JSON.stringify({ 'my-flag': false }),
      );

      const client = fakeClient();
      const context = new Context({ client, initStatus: 'failed' });

      setCurrentContext(context);
      subscribeToClient(client, context, false);

      client.flags = { 'my-flag': true, 'other-flag': 'b' };
      client.emit('initialized');

      assert.strictEqual(context.initStatus, 'initialized');
      assert.deepEqual(context.allFlags, { 'my-flag': false });
    });

    test('ignores initialized once the context is initialized', async function (assert) {
      const client = fakeClient({ 'my-flag': 1 });
      const context = new Context({ client, flags: client.allFlags() });

      setCurrentContext(context);
      subscribeToClient(client, context, false);

      client.flags = { 'my-flag': 2 };
      client.emit('initialized');

      assert.strictEqual(context.get('my-flag'), 1);
    });

    test('loads every flag when changes arrive after a failed init, even without streaming', async function (assert) {
      const client = fakeClient();
      const context = new Context({ client, initStatus: 'failed' });

      setCurrentContext(context);
      subscribeToClient(client, context, false);

      client.flags = { 'my-flag': true, 'other-flag': 'b' };
      client.emit('change', { 'my-flag': { current: true } });

      assert.strictEqual(context.initStatus, 'initialized');
      assert.true(context.get('my-flag'));
      assert.strictEqual(context.get('other-flag'), 'b');
    });

    test('applies only streamed flags once initialized', async function (assert) {
      const client = fakeClient({ streamed: 1, 'not-streamed': 1 });
      const context = new Context({ client, flags: client.allFlags() });

      subscribeToClient(client, context, { streamed: true });

      client.flags = { streamed: 2, 'not-streamed': 2 };
      client.emit('change', {
        streamed: { current: 2, previous: 1 },
        'not-streamed': { current: 2, previous: 1 },
      });

      assert.strictEqual(context.initStatus, 'initialized');
      assert.strictEqual(context.get('streamed'), 2);
      assert.strictEqual(context.get('not-streamed'), 1);
    });
  });

  module('#bootstrapLoader', function (hooks) {
    hooks.afterEach(function () {
      removeCurrentContext();
      window.localStorage.removeItem('ember-launch-darkly');
    });

    function setup(bootstrap, startFlags, clientFlags) {
      const loader = bootstrapLoader(bootstrap);
      const client = fakeClient(clientFlags);
      const context = new Context({ client, flags: startFlags });

      setCurrentContext(context);
      loader.loadInto(context, startFlags);

      return { loader, client, context };
    }

    test('only applies to localFlags and localStorage bootstraps', function (assert) {
      assert.ok(bootstrapLoader('localFlags'));
      assert.ok(bootstrapLoader('localStorage'));
      assert.ok(bootstrapLoader('LOCALSTORAGE'));
      assert.strictEqual(bootstrapLoader({ 'my-flag': true }), undefined);
      assert.strictEqual(bootstrapLoader(undefined), undefined);
    });

    test('loads the first full payload, then stops', function (assert) {
      const { loader, client, context } = setup(
        'localFlags',
        { 'my-flag': 'local', 'local-only': true },
        { 'my-flag': 'live', 'new-flag': 1 },
      );

      loader.inspector.method();

      assert.deepEqual(context.allFlags, { 'my-flag': 'live', 'new-flag': 1 });

      client.flags = { 'my-flag': 'later' };
      loader.inspector.method();

      assert.strictEqual(
        context.get('my-flag'),
        'live',
        'later payloads are left to streamingFlags',
      );
    });

    test("reads the client's flags when it runs, not the payload's", function (assert) {
      const { loader, client, context } = setup(
        'localFlags',
        { 'my-flag': 'local' },
        { 'my-flag': 'live' },
      );

      client.flags = { 'my-flag': 'patched' };
      loader.inspector.method({ 'my-flag': { value: 'live' } });

      assert.strictEqual(context.get('my-flag'), 'patched');
    });

    test('leaves the context alone when LaunchDarkly agrees', function (assert) {
      const { loader, client, context } = setup(
        'localStorage',
        { 'my-flag': 'cached' },
        { 'my-flag': 'cached' },
      );

      context.set('my-flag', 'tweaked');
      loader.inspector.method();

      assert.strictEqual(context.get('my-flag'), 'tweaked', 'not replaced');

      client.flags = { 'my-flag': 'later' };
      loader.inspector.method();

      assert.strictEqual(context.get('my-flag'), 'tweaked', 'and stopped');
    });

    test('keeps persisted flags, like a successful init', function (assert) {
      const { loader, context } = setup(
        'localFlags',
        {},
        { 'my-flag': 'live', 'new-flag': 1 },
      );

      window.localStorage.setItem(
        'ember-launch-darkly',
        JSON.stringify({ 'my-flag': 'persisted' }),
      );
      loader.inspector.method();

      assert.deepEqual(context.allFlags, { 'my-flag': 'persisted' });
    });

    test('leaves a destroyed or replaced context alone', function (assert) {
      const { loader, context } = setup(
        'localFlags',
        { 'my-flag': 'local' },
        { 'my-flag': 'live' },
      );

      setCurrentContext(new Context());
      loader.inspector.method();

      assert.strictEqual(context.get('my-flag'), 'local');
    });
  });
});
