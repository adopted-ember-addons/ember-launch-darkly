const pluginTester = require('babel-plugin-tester');
const plugin = require('../babel-plugin');

pluginTester({
  plugin,
  title: 'Launch Darkly Babel Plugin',
  snapshot: false,
  tests: [
    {
      title: 'Variation helper inside Ember computed',
      code: `
      import { Component } from '@ember/component';
      import { computed } from '@ember/computed';
      import { variation } from 'ember-launch-darkly';

      export default Component.extend({
        discount: computed(function () {
          if (variation('new-pricing')) {
            return 5;
          }

          return 2;
        })
      });
      `,
      output: `
      import { Component } from '@ember/component';
      import { computed } from '@ember/computed';
      export default Component.extend({
        discount: computed(function () {
          if (this.get("launchDarkly.new-pricing")) {
            return 5;
          }

          return 2;
        })
      });
      `
    },

    {
      title: 'Variation helper with local name inside Ember computed',
      code: `
      import { Component } from '@ember/component';
      import { computed } from '@ember/computed';
      import { variation as vvv } from 'ember-launch-darkly';

      export default Component.extend({
        discount: computed(function () {
          if (vvv('new-pricing')) {
            return 5;
          }

          return 2;
        })
      });
      `,
      output: `
      import { Component } from '@ember/component';
      import { computed } from '@ember/computed';
      export default Component.extend({
        discount: computed(function () {
          if (this.get("launchDarkly.new-pricing")) {
            return 5;
          }

          return 2;
        })
      });
      `
    },

    {
      title: 'Variation helper inside computedWithVariation',
      code: `
      import { Component } from '@ember/component';
      import { variation, computedWithVariation } from 'ember-launch-darkly';

      export default Component.extend({
        discount: computedWithVariation(function () {
          if (variation('new-pricing')) {
            return 5;
          }

          return 2;
        }),

        colors: computedWithVariation(function() {
          if (variation('red')) {
            return 'red';
          }

          if (variation('green')) {
            return 'green';
          }

          return 'blue';
        })
      });
      `,
      output: `
      import { Component } from '@ember/component';
      import { computedWithVariation } from 'ember-launch-darkly';
      export default Component.extend({
        discount: computedWithVariation("launchDarkly.new-pricing", function () {
          if (this.get("launchDarkly.new-pricing")) {
            return 5;
          }

          return 2;
        }),
        colors: computedWithVariation("launchDarkly.{red,green}", function () {
          if (this.get("launchDarkly.red")) {
            return 'red';
          }

          if (this.get("launchDarkly.green")) {
            return 'green';
          }

          return 'blue';
        })
      });
      `
    },

    {
      title: 'Variation helper inside computedWithVariation with local name',
      code: `
      import { Component } from '@ember/component';
      import { variation, computedWithVariation as computed } from 'ember-launch-darkly';

      export default Component.extend({
        discount: computed(function () {
          if (variation('new-pricing')) {
            return 5;
          }

          return 2;
        }),

        colors: computed(function() {
          if (variation('red')) {
            return 'red';
          }

          if (variation('green')) {
            return 'green';
          }

          return 'blue';
        })
      });
      `,
      output: `
      import { Component } from '@ember/component';
      import { computedWithVariation as computed } from 'ember-launch-darkly';
      export default Component.extend({
        discount: computed("launchDarkly.new-pricing", function () {
          if (this.get("launchDarkly.new-pricing")) {
            return 5;
          }

          return 2;
        }),
        colors: computed("launchDarkly.{red,green}", function () {
          if (this.get("launchDarkly.red")) {
            return 'red';
          }

          if (this.get("launchDarkly.green")) {
            return 'green';
          }

          return 'blue';
        })
      });
      `
    },

    {
      title: 'Variation helper inside standard function',
      code: `
      import { Component } from '@ember/component';
      import { variation } from 'ember-launch-darkly';

      export default Component.extend({
        discount() {
          if (variation('new-pricing')) {
            return 5;
          }

          return 2;
        }
      });
      `,
      output: `
      import { Component } from '@ember/component';
      export default Component.extend({
        discount() {
          if (this.get("launchDarkly.new-pricing")) {
            return 5;
          }

          return 2;
        }

      });
      `
    }
  ]
});
