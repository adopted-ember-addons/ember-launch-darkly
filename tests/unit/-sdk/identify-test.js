import { module, test } from 'qunit';

import Context, {
  setCurrentContext,
  removeCurrentContext,
} from 'ember-launch-darkly/-sdk/context';
import { identify } from 'ember-launch-darkly';

module('Unit | SDK | Identify', function (hooks) {
  hooks.afterEach(function () {
    removeCurrentContext();
  });

  test('identifying a user - local', async function (assert) {
    assert.expect(2);

    let flags = {
      cheese: 'bacon',
    };

    let context = new Context({ flags });

    setCurrentContext(context);

    let result = await identify({ key: 'cheese' });

    assert.true(result.isOk, 'identify succeeded');
    assert.deepEqual(
      context.allFlags,
      flags,
      'User identified and flags updated',
    );
  });

  test('identifying a user - remote', async function (assert) {
    assert.expect(3);

    let flags = {
      cheese: 'bacon',
    };

    let client = {
      identify(user) {
        assert.deepEqual(
          user,
          {
            key: 'cheese',
          },
          'Identify on LD client called',
        );

        return {
          foo: true,
          bar: false,
        };
      },
    };

    let context = new Context({ flags, client });

    setCurrentContext(context);

    let result = await identify({ key: 'cheese' });

    assert.true(result.isOk, 'identify succeeded');
    assert.deepEqual(
      context.allFlags,
      {
        foo: true,
        bar: false,
      },
      'User identified and flags updated',
    );
  });

  test('identify without initialization returns error result', async function (assert) {
    let result = await identify({ key: 'cheese' });

    assert.false(result.isOk, 'identify failed');
    assert.ok(result.error, 'error is present');
    assert.ok(
      result.error.message.includes('has not been initialized'),
      'error message indicates missing initialization',
    );
  });

  test('identify with remote client failure returns error result', async function (assert) {
    let flags = { foo: 'bar' };

    let client = {
      identify() {
        throw new Error('Network error');
      },
    };

    let context = new Context({ flags, client });
    setCurrentContext(context);

    let result = await identify({ key: 'cheese' });

    assert.false(result.isOk, 'identify failed');
    assert.ok(result.error, 'error is present');
    assert.strictEqual(
      result.error.message,
      'Network error',
      'original error is preserved',
    );
  });
});
