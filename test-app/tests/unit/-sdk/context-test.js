import { module, test } from 'qunit';

import Context, {
  setCurrentContext,
  getCurrentContext,
  setPersistedFlags,
} from 'ember-launch-darkly/-sdk/context';

module('Unit | SDK | Context', function () {
  test('constructor', function (assert) {
    let context = new Context({ flags: {} });
    assert.strictEqual(
      Object.keys(context.allFlags).length,
      0,
      'Initialize with no flags',
    );

    context = new Context({ flags: { foo: true } });
    assert.strictEqual(
      Object.keys(context.allFlags).length,
      1,
      'Initialize with flags',
    );
  });

  test('#updateFlags', function (assert) {
    let context = new Context({ flags: { foo: true, bar: true } });

    assert.strictEqual(
      Object.keys(context.allFlags).length,
      2,
      'Initialize with flags',
    );

    context.updateFlags({ bar: false, baz: true });

    assert.deepEqual(
      context.allFlags,
      {
        foo: true,
        bar: false,
        baz: true,
      },
      'Update flags',
    );
  });

  test('#replaceFlags', function (assert) {
    let context = new Context({ flags: { foo: true, bar: true } });

    assert.strictEqual(
      Object.keys(context.allFlags).length,
      2,
      'Initialize with flags',
    );

    context.replaceFlags({ bar: false, baz: true });

    assert.deepEqual(
      context.allFlags,
      {
        bar: false,
        baz: true,
      },
      'Replace flags',
    );
  });

  test('#enable', function (assert) {
    let context = new Context({ flags: { foo: true, bar: false } });

    assert.deepEqual(
      context.allFlags,
      { foo: true, bar: false },
      'Initial flag state',
    );

    context.enable('bar');

    assert.deepEqual(
      context.allFlags,
      { foo: true, bar: true },
      'Updated flag state',
    );
  });

  test('#disable', function (assert) {
    let context = new Context({ flags: { foo: true, bar: false } });

    assert.deepEqual(
      context.allFlags,
      { foo: true, bar: false },
      'Initial flag state',
    );

    context.disable('foo');

    assert.deepEqual(
      context.allFlags,
      { foo: false, bar: false },
      'Updated flag state',
    );
  });

  test('#set', function (assert) {
    let context = new Context({ flags: { foo: true, bar: false } });

    assert.deepEqual(
      context.allFlags,
      { foo: true, bar: false },
      'Initial flag state',
    );

    context.set('foo', 'baz');

    assert.deepEqual(
      context.allFlags,
      { foo: 'baz', bar: false },
      'Updated flag state',
    );
  });

  test('#get', function (assert) {
    let context = new Context({ flags: { foo: true, bar: false } });

    assert.true(context.get('foo'), 'Initial flag state');
    assert.strictEqual(
      context.get('moo', 'bah'),
      'bah',
      `Return default value if flag doesn't exist`,
    );
  });

  test('allFlags', function (assert) {
    let context = new Context({ flags: { foo: true, bar: false } });

    let flags = context.allFlags;

    assert.deepEqual(
      flags,
      { foo: true, bar: false },
      'All flags accounted for',
    );
  });

  test('isLocal', function (assert) {
    assert.true(new Context({ flags: {} }).isLocal, 'Operating in local mode');
    assert.false(
      new Context({ flags: {}, client: {} }).isLocal,
      'Operating in remote mode',
    );
  });

  test('user', function (assert) {
    let client = {
      getContext() {
        return { key: 'foo' };
      },
    };

    assert.deepEqual(new Context({ flags: {} }).user, {
      key: 'local-mode-no-user-specified',
    });
    assert.deepEqual(new Context({ flags: {}, client }).user, { key: 'foo' });
  });

  module('#persistence', function (innerHooks) {
    innerHooks.afterEach(function () {
      localStorage.removeItem('ember-launch-darkly');
    });

    test('#persist / persisted', function (assert) {
      let context = new Context({ flags: { foo: true, bar: false } });
      context.persist();

      assert.deepEqual(
        context.persisted,
        { foo: true, bar: false },
        'Flags persisted in local storage',
      );
    });

    test('#setPersistedFlags', function (assert) {
      localStorage.setItem(
        'ember-launch-darkly',
        JSON.stringify({ foo: true, bar: false }),
      );
      let context = new Context({ flags: { foo: false, bar: true } });
      setPersistedFlags(context);

      assert.deepEqual(
        context.allFlags,
        { foo: true, bar: false },
        'Persisted flags were set to context',
      );
    });
  });

  module('initStatus', function () {
    test('defaults to "local" when no client is provided', function (assert) {
      let context = new Context({ flags: { flag: true } });

      assert.strictEqual(context.initStatus, 'local');
      assert.true(context.initSucceeded);
      assert.strictEqual(context.initError, undefined);
    });

    test('defaults to "initialized" when a client is provided', function (assert) {
      let context = new Context({ flags: { flag: true }, client: {} });

      assert.strictEqual(context.initStatus, 'initialized');
      assert.true(context.initSucceeded);
    });

    test('accepts explicit initStatus', function (assert) {
      let error = new Error('timeout');
      let context = new Context({
        flags: {},
        client: {},
        initStatus: 'failed',
        initError: error,
      });

      assert.strictEqual(context.initStatus, 'failed');
      assert.false(context.initSucceeded);
      assert.strictEqual(context.initError, error);
    });

    test('transitionStatus updates status and fires callback', function (assert) {
      let changes = [];
      let context = new Context({
        flags: {},
        initStatus: 'local',
        onStatusChange: (n, p) => {
          changes.push({ n, p });
        },
      });

      context.transitionStatus('failed', new Error('oops'));

      assert.strictEqual(context.initStatus, 'failed');
      assert.strictEqual(changes.length, 1);
      assert.strictEqual(changes[0].n, 'failed');
      assert.strictEqual(changes[0].p, 'local');
    });

    test('transitionStatus is a no-op for same status', function (assert) {
      let changes = [];
      let context = new Context({
        flags: {},
        initStatus: 'local',
        onStatusChange: (n, p) => {
          changes.push({ n, p });
        },
      });

      context.transitionStatus('local');

      assert.strictEqual(changes.length, 0);
    });
  });

  module('error handling', function () {
    test('lastError starts as undefined', function (assert) {
      let context = new Context({ flags: {} });

      assert.strictEqual(context.lastError, undefined);
    });

    test('handleError sets lastError and fires onError', function (assert) {
      let errors = [];
      let context = new Context({
        flags: {},
        initStatus: 'local',
        onError: (err) => errors.push(err),
      });

      let error = new Error('stream dropped');
      context.handleError(error);

      assert.strictEqual(context.lastError, error);
      assert.strictEqual(errors.length, 1);
      assert.strictEqual(errors[0], error);
    });

    test('handleError works without onError callback', function (assert) {
      let context = new Context({ flags: {} });

      let error = new Error('no callback');
      context.handleError(error);

      assert.strictEqual(context.lastError, error, 'lastError is still set');
    });
  });

  module('SDK passthroughs', function () {
    test('track delegates to client', function (assert) {
      assert.expect(3);

      let client = {
        track(key, data, metricValue) {
          assert.strictEqual(key, 'purchase');
          assert.deepEqual(data, { item: 'shirt' });
          assert.strictEqual(metricValue, 42);
        },
      };

      let context = new Context({ flags: {}, client });
      context.track('purchase', { item: 'shirt' }, 42);
    });

    test('track is a no-op in local mode', function (assert) {
      let context = new Context({ flags: {} });
      context.track('purchase'); // should not throw
      assert.ok(true, 'no error thrown in local mode');
    });

    test('variationDetail delegates to client', function (assert) {
      let client = {
        variationDetail() {
          return {
            value: true,
            variationIndex: 0,
            reason: { kind: 'FALLTHROUGH' },
          };
        },
      };

      let context = new Context({ flags: { flag: true }, client });
      let detail = context.variationDetail('flag');

      assert.strictEqual(detail.value, true);
      assert.strictEqual(detail.variationIndex, 0);
      assert.strictEqual(detail.reason.kind, 'FALLTHROUGH');
    });

    test('variationDetail returns value from flags in local mode', function (assert) {
      let context = new Context({ flags: { flag: 'hello' } });
      let detail = context.variationDetail('flag');

      assert.strictEqual(detail.value, 'hello');
      assert.strictEqual(detail.variationIndex, undefined);
      assert.strictEqual(detail.reason, undefined);
    });

    test('close delegates to client', async function (assert) {
      assert.expect(1);

      let client = {
        close() {
          assert.ok(true, 'client.close() called');
          return Promise.resolve();
        },
      };

      let context = new Context({ flags: {}, client });
      await context.close();
    });

    test('close is safe in local mode', async function (assert) {
      let context = new Context({ flags: {} });
      await context.close(); // should not throw
      assert.ok(true, 'no error thrown in local mode');
    });

    test('flush delegates to client', async function (assert) {
      assert.expect(1);

      let client = {
        flush() {
          assert.ok(true, 'client.flush() called');
          return Promise.resolve();
        },
      };

      let context = new Context({ flags: {}, client });
      await context.flush();
    });

    test('flush is safe in local mode', async function (assert) {
      let context = new Context({ flags: {} });
      await context.flush(); // should not throw
      assert.ok(true, 'no error thrown in local mode');
    });

    test('close with force does not await client.close()', async function (assert) {
      assert.expect(1);

      let client = {
        close() {
          assert.ok(true, 'client.close() called');
          // Simulate a hanging flush — returns a promise that never resolves
          return new Promise(() => {});
        },
      };

      let context = new Context({ flags: {}, client });
      // force: true should return immediately, not hang
      await context.close({ force: true });
    });

    test('destroy closes client and removes current context', async function (assert) {
      assert.expect(3);

      let client = {
        close() {
          assert.ok(true, 'client.close() called');
          return Promise.resolve();
        },
      };

      let context = new Context({ flags: { flag: true }, client });
      setCurrentContext(context);

      assert.ok(getCurrentContext(), 'context is set before destroy');

      await context.destroy();

      assert.strictEqual(
        getCurrentContext(),
        null,
        'context removed after destroy',
      );
    });

    test('destroy with force does not hang', async function (assert) {
      let client = {
        close() {
          return new Promise(() => {}); // never resolves
        },
      };

      let context = new Context({ flags: {}, client });
      setCurrentContext(context);

      await context.destroy({ force: true });

      assert.strictEqual(
        getCurrentContext(),
        null,
        'context removed after force destroy',
      );
    });
  });
});
