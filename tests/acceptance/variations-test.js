import { visit, click } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';

import setupLaunchDarkly from 'ember-launch-darkly/test-support/setup-launch-darkly';

module('Acceptance | variations', function(hooks) {
  setupApplicationTest(hooks);
  setupLaunchDarkly(hooks);

  test('Defining and using feature flags', async function(assert) {
    assert.expect(10);

    await visit('/acceptance-tests');

    assert.dom('.flag-value').hasText('false', 'Feature flag is disabled');
    assert.dom('.template-if-statement').hasText('FOO', 'Test variation helper in template "if" statement');
    assert.dom('.template-with-statement').hasText('FOO -', 'Test variation helper in template "with" statement');
    assert.dom('.template-let-statement').hasText('FOO', 'Test variation helper in template "let" statement');
    assert.dom('.single-variation-computed').hasText('FOO', 'Test single variation in computed property in controller');
    assert.dom('.multiple-variation-computed').hasText('FOO', 'Test multiiple variations in computed property in controller');

    await click('.toggle');

    assert.dom('.flag-value').hasText('true', 'Feature flag is enabled');
    assert.dom('.template-if-statement').hasText('BAR', 'Test variation helper in template "if" statement');
    assert.dom('.template-with-statement').hasText('BAR - true', 'Test variation helper in template "with" statement');
    assert.dom('.template-let-statement').hasText('BAR', 'Test variation helper in template "let" statement');
    //assert.dom('.single-variation-computed').hasText('BAR', 'Test single computed property in controller');
    //assert.dom('.multiple-variation-computed').hasText('BAR', 'Test multiple variations in  computed property in controller');
  });
});
