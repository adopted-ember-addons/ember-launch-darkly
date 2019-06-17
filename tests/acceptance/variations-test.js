import { test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';
import StubClient from 'ember-launch-darkly/test-support/helpers/launch-darkly-client-test';

moduleForAcceptance('Acceptance | variations', {
  beforeEach() {
    this.application.__container__.registry.register('service:launch-darkly-client', StubClient)
  }
});

test('Feature flag is disabled', async function(assert) {
  assert.expect(2);

  withVariation('apply-discount', false);

  await visit('/login');

  assert.equal(currentURL(), '/login');
  assert.equal(find('.cheese').text().trim(), 'PRICE: £ 199', 'Feature flag is disabled');
});

test('Feature flag is enabled', async function(assert) {
  assert.expect(2);

  withVariation('apply-discount', true);

  await visit('/login');

  assert.equal(currentURL(), '/login');

  assert.equal(find('.cheese').text().trim(), 'PRICE: £ 99', 'Feature flag is disabled');
});
