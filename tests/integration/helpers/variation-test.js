import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';
import StubClient from 'ember-launch-darkly/test-support/helpers/launch-darkly-client-test';
import { find, render, waitUntil } from '@ember/test-helpers';

module('Helper | variation', function(hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('service:launch-darkly-client', StubClient);
    this.service = this.owner.lookup('service:launch-darkly-client');
  });

  test('it returns a variation', async function(assert) {
    assert.expect(2);

    await render(hbs`
      {{#if (variation "foo-bar")}}
        <h1 class="cheese">YAY</h1>
      {{else}}
        <h1 class="cheese">BOO</h1>
      {{/if}}
    `);

    assert.equal(find('.cheese').textContent.trim(), 'BOO', 'Feature flag is disabled');

    this.service.enable('foo-bar');

    await waitUntil(() => find('.cheese').textContent.trim() === 'YAY');

    assert.ok(true, 'Feature flag is enabled');
  });
});
