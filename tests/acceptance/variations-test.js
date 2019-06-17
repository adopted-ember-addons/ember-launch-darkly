import { visit, currentURL } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';

import setupLaunchDarkly from 'ember-launch-darkly/test-support/setup-launch-darkly';

module('Acceptance | variations', function(hooks) {
  setupApplicationTest(hooks);
  setupLaunchDarkly(hooks);

  test('Feature flag is disabled', async function(assert) {
    assert.expect(2);

    this.withVariation('apply-discount', false);

    await visit('/login');

    assert.equal(currentURL(), '/login', 'Navigate to the correct page');
    assert.dom('.cheese').hasText('PRICE: £ 199', 'Feature flag is disabled');
  });

  test('Feature flag is enabled', async function(assert) {
    assert.expect(2);

    this.withVariation('apply-discount', true);

    await visit('/login');

    assert.equal(currentURL(), '/login', 'Navigate to the correct page');
    assert.dom('.cheese').hasText('PRICE: £ 99', 'Feature flag is enabled');
  });
});
