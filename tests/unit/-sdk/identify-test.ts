import { module, test } from 'qunit';

import Context, {
  setCurrentContext,
  removeCurrentContext,
} from '#src/-sdk/context.ts';
import type { LDClient } from 'launchdarkly-js-client-sdk';
import { identify } from '#src/index.ts';

module('Unit | SDK | Identify', function (hooks) {
  hooks.afterEach(function () {
    removeCurrentContext();
  });

  test('identifying a user - local', async function (assert) {
    assert.expect(1);

    const flags = {
      cheese: 'bacon',
    };

    const context = new Context(flags);

    setCurrentContext(context);

    await identify({ key: 'cheese' });

    assert.deepEqual(
      context.allFlags,
      flags,
      'User identified and flags updated',
    );
  });

  test('identifying a user - remote', async function (assert) {
    assert.expect(2);

    const flags = {
      cheese: 'bacon',
    };

    const client = {
      identify(user: { key: string }) {
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

    const context = new Context(flags, client as unknown as LDClient);

    setCurrentContext(context);

    await identify({ key: 'cheese' });

    assert.deepEqual(
      context.allFlags,
      {
        foo: true,
        bar: false,
      },
      'User identified and flags replaced',
    );
  });
});
