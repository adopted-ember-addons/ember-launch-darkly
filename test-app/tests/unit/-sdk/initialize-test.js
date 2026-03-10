import { module, test } from 'qunit';

import {
  initialize,
  shouldUpdateFlag,
} from 'ember-launch-darkly/-sdk/initialize';
import {
  getCurrentContext,
  removeCurrentContext,
} from 'ember-launch-darkly/-sdk/context';

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
});
