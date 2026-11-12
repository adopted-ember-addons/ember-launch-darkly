import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

import { variation } from 'ember-launch-darkly';
import setupLaunchDarkly from 'ember-launch-darkly/test-support/setup-launch-darkly';

module('Unit | Test support | setupLaunchDarkly', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register(
      'config:environment',
      {
        launchDarkly: {
          localFlags: { 'local-flag': true },
          defaultFlags: { 'local-flag': true, 'default-flag': 'b' },
        },
      },
      { instantiate: false },
    );
  });

  setupLaunchDarkly(hooks);

  test('starts every flag in localFlags and defaultFlags off', async function (assert) {
    assert.false(variation('local-flag'));
    assert.false(variation('default-flag'));

    await this.withVariation('default-flag', 'c');

    assert.strictEqual(variation('default-flag'), 'c');
  });
});
