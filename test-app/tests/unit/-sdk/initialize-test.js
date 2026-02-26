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

    test('it initializes in local mode with provided flags', async function (assert) {
      await initialize(
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
    });

    test('it does not throw by default when remote init fails', async function (assert) {
      await initialize(
        'invalid-client-id',
        {},
        {
          mode: 'remote',
          timeout: 1,
        },
      );

      const context = getCurrentContext();
      assert.ok(context, 'context was created despite init failure');
    });

    test('it throws when throwOnInitializationError is true and remote init fails', async function (assert) {
      try {
        await initialize(
          'invalid-client-id',
          {},
          {
            mode: 'remote',
            timeout: 1,
            throwOnInitializationError: true,
          },
        );

        assert.ok(false, 'should have thrown');
      } catch (error) {
        assert.ok(error, 'initialize threw an error');
        assert.notOk(
          getCurrentContext(),
          'context was not set when error is thrown',
        );
      }
    });
  });
});
