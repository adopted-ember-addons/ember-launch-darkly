import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import StubClient from 'ember-launch-darkly/test-support/helpers/launch-darkly-client-test';
import { currentURL, find, visit } from '@ember/test-helpers';

module('Acceptance | variations', function(hooks) {
  setupApplicationTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('service:launch-darkly-client', StubClient);
    this.service = this.owner.lookup('service:launch-darkly-client');
  });

  test('Feature flag is disabled', async function(assert) {
    assert.expect(2);

    this.service.setVariation('apply-discount', false);

    await visit('/login');

    assert.equal(currentURL(), '/login');

    assert.equal(find('.cheese').textContent.trim(), 'PRICE: £ 199', 'Feature flag is disabled');
  });

  test('Feature flag is enabled', async function(assert) {
    assert.expect(2);

    this.service.setVariation('apply-discount', true);

    await visit('/login');

    assert.equal(currentURL(), '/login');

    assert.equal(find('.cheese').textContent.trim(), 'PRICE: £ 99', 'Feature flag is disabled');
  });
});
