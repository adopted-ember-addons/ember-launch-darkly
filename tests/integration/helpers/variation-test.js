import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';

import setupLaunchDarkly from 'ember-launch-darkly/test-support/setup-launch-darkly';

module('Integration | Helper | foo', function(hooks) {
  setupRenderingTest(hooks);
  setupLaunchDarkly(hooks);

  test('it returns a variation', async function(assert) {
    assert.expect(2);

    await render(hbs`
      {{#if (variation "foo-bar")}}
        <h1>YAY</h1>
      {{else}}
        <h1>BOO</h1>
      {{/if}}
    `);

    assert.dom('h1').hasText('BOO', 'Feature flag is disabled');

    this.withVariation('foo-bar');

    await settled();

    assert.dom('h1').hasText('YAY', 'Feature flag is enabled');
  });
});
