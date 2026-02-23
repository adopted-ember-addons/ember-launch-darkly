import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';

import variation from '#src/helpers/variation.ts';
import { setupLaunchDarkly } from '#src/test-support.ts';
import type { LDTestContext } from '#src/test-support.ts';

module('Integration | Helper | variation', function (hooks) {
  setupRenderingTest(hooks);
  setupLaunchDarkly(hooks);

  test('it returns a variation', async function (this: LDTestContext, assert) {
    assert.expect(2);

    await render(
      <template>
        {{#if (variation "foo-bar")}}
          <h1>YAY</h1>
        {{else}}
          <h1>BOO</h1>
        {{/if}}
      </template>,
    );

    assert.dom('h1').hasText('BOO', 'Feature flag is disabled');

    await this.withVariation!('foo-bar');

    assert.dom('h1').hasText('YAY', 'Feature flag is enabled');
  });

  test('it returns the default value if variation is unknown', async function (this: LDTestContext, assert) {
    assert.expect(2);

    await render(
      <template>
        <h1>{{variation "cheese" "bacon"}}</h1>
      </template>,
    );

    assert.dom('h1').hasText('bacon', 'Feature flag default value returned');

    await this.withVariation!('cheese', 'tomato');

    assert.dom('h1').hasText('tomato', 'Feature flag value returned');
  });
});
