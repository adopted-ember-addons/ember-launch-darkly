import { moduleForComponent, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';
import StubClient from 'ember-launch-darkly/test-support/helpers/launch-darkly-client-test';
import { waitUntil } from 'ember-native-dom-helpers';

moduleForComponent('variation', 'helper:variation', {
  integration: true,

  beforeEach() {
    this.register('service:launch-darkly-client', StubClient);
    this.inject.service('launch-darkly-client', { as: 'client' });
  }
});

test('it returns a variation', async function(assert) {
  assert.expect(2);

  this.render(hbs`
    {{#if (variation "foo-bar")}}
      <h1 class="cheese">YAY</h1>
    {{else}}
      <h1 class="cheese">BOO</h1>
    {{/if}}
  `);

  assert.equal(this.$('.cheese').text().trim(), 'BOO', 'Feature flag is disabled');

  this.get('client').enable('foo-bar');

  await waitUntil(() => this.$('.cheese').text().trim() === 'YAY');

  assert.ok(true, 'Feature flag is enabled');
});
