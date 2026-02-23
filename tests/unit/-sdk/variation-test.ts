import { module, test } from 'qunit';

import Context, {
  setCurrentContext,
  removeCurrentContext,
} from '#src/-sdk/context.ts';
import type { LDClient } from 'launchdarkly-js-client-sdk';

import { variation } from '#src/index.ts';

module('Unit | SDK | Variation', function (hooks) {
  hooks.afterEach(function () {
    removeCurrentContext();
  });

  test('evaluating a variation - local', function (assert) {
    assert.expect(1);

    const flags = {
      foo: 'bar',
    };

    const context = new Context(flags);

    setCurrentContext(context);

    const result = variation('foo');

    assert.strictEqual(result, 'bar', 'Variation value returned');
  });

  test('evaluating a variation - remote', function (assert) {
    assert.expect(2);

    const flags = {
      cheese: 'bacon',
    };

    const client = {
      variation(key: string) {
        assert.strictEqual(key, 'cheese', 'Variation event sent to LD');
      },
    };

    const context = new Context(flags, client as unknown as LDClient);

    setCurrentContext(context);

    const result = variation('cheese');

    assert.strictEqual(result, 'bacon', 'Variation value returned');
  });

  test('default variation value', function (assert) {
    assert.expect(2);

    const flags = {};
    const context = new Context(flags);

    setCurrentContext(context);

    let result = variation('unknown-flag');

    assert.strictEqual(
      result,
      undefined,
      'Undefined returned for unknown flag',
    );

    result = variation('unknown-flag', 'default-value');

    assert.strictEqual(
      result,
      'default-value',
      'Default value returned for unknown flag',
    );
  });
});
