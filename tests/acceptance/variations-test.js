import { visit, currentURL } from '@ember/test-helpers';
import { module, test } from 'qunit';

import setupLlaunchDarkly from 'ember-launch-darkly/addon-test-support/setup-launch-darkly';

module('Acceptance | variations', function(hooks) {
  setupLlaunchDarkly(hooks);

  test('Feature flag is disabled', async function(assert) {
    assert.expect(2);

    this.withVariation('apply-discount', false);

    await visit('/login');

    assert.equal(currentURL(), '/login');
    assert.equal(find('.cheese').text().trim(), 'PRICE: £ 199', 'Feature flag is disabled');
  });

  test('Feature flag is enabled', async function(assert) {
    assert.expect(2);

    this.withVariation('apply-discount', true);

    await visit('/login');

    assert.equal(currentURL(), '/login');

    assert.equal(find('.cheese').text().trim(), 'PRICE: £ 99', 'Feature flag is disabled');
  });
});
