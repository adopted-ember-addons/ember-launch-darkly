import pluginTester from 'babel-plugin-tester';
import plugin from '../launch-darkly-variation-helper';

pluginTester({
  plugin,
  title: 'Import transformations',
  snapshot: false,
  tests: [
    {
      title: 'Single import',
      code: `
      import foo from 'foo';
      import { variation } from 'ember-launch-darkly';
      `,
      output: `
      import foo from 'foo';
      `
    },
    {
      title: 'Multiple imports',
      code: `
      import foo from 'foo';
      import { bar, variation, baz } from 'ember-launch-darkly';
      `,
      output: `
      import foo from 'foo';
      import { bar, baz } from 'ember-launch-darkly';
      `
    },
    {
      title: 'Single import (aliased)',
      code: `
      import foo from 'foo';
      import { variation as v } from 'ember-launch-darkly';
      `,
      output: `import foo from 'foo';`
    },
    {
      title: 'Multiple imports (aliased)',
      code: `
      import foo from 'foo';
      import { bar, variation as v, baz } from 'ember-launch-darkly';
      `,
      output: `
      import foo from 'foo';
      import { bar, baz } from 'ember-launch-darkly';
      `
    }
  ]
});

pluginTester({
  plugin,
  title: 'Launch Darkly service injection',
  snapshot: false,
  tests: [
    {
      title: 'Export inline object as default',
      code: `
      import computed from 'ember-computed';
      import { variation } from 'ember-launch-darkly';

      export default Component.extend({
        foo: computed(function() {
          if(variation('bar')) {
            return null;
          }
        })
      });
      `,
      output: `
      import { default as launchDarklyService } from 'ember-service/inject';
      import computed from 'ember-computed';


      export default Component.extend({
        launchDarkly: launchDarklyService(),

        foo: computed('launchDarkly.bar', function () {
          const launchDarkly = this.get('launchDarkly');

          if (launchDarkly.get('bar')) {
            return null;
          }
        })
      });
      `
    },
    {
      title: 'Export variable declaration as default',
      code: `
      import computed from 'ember-computed';
      import { variation } from 'ember-launch-darkly';

      const Thing = Component.extend({
        foo: computed(function() {
          if(variation('bar')) {
            return null;
          }
        })
      });

      export default Thing;
      `,
      output: `
      import { default as launchDarklyService } from 'ember-service/inject';
      import computed from 'ember-computed';


      const Thing = Component.extend({
        launchDarkly: launchDarklyService(),

        foo: computed('launchDarkly.bar', function () {
          const launchDarkly = this.get('launchDarkly');

          if (launchDarkly.get('bar')) {
            return null;
          }
        })
      });

      export default Thing;
      `
    },
    {
      title: 'Export variable declaration as member',
      code: `
      import computed from 'ember-computed';
      import { variation } from 'ember-launch-darkly';

      const Thing = Component.extend({
        foo: computed(function() {
          if(variation('bar')) {
            return null;
          }
        })
      });

      export { Thing };
      `,
      output: `
      import { default as launchDarklyService } from 'ember-service/inject';
      import computed from 'ember-computed';


      const Thing = Component.extend({
        launchDarkly: launchDarklyService(),

        foo: computed('launchDarkly.bar', function () {
          const launchDarkly = this.get('launchDarkly');

          if (launchDarkly.get('bar')) {
            return null;
          }
        })
      });

      export { Thing };
      `
    }
  ]
});

pluginTester({
  plugin,
  title: 'Variation invocation transformations',
  snapshot: false,
  filename: __filename,
  tests: [
    {
      title: 'Base helper invocations',
      fixture: '__fixtures__/helper-invocations/input.js',
      outputFixture: '__fixtures__/helper-invocations/expected.js'
    },
    {
      title: 'Invoke using alias',
      code: `
      import computed from 'ember-computed';
      import { variation as foo } from 'ember-launch-darkly';

      export default Component.extend({
        foo: computed(function() {
          if(foo('bar')) {
            return null;
          }
        })
      });
      `,
      output: `
      import { default as launchDarklyService } from 'ember-service/inject';
      import computed from 'ember-computed';


      export default Component.extend({
        launchDarkly: launchDarklyService(),

        foo: computed('launchDarkly.bar', function () {
          const launchDarkly = this.get('launchDarkly');

          if (launchDarkly.get('bar')) {
            return null;
          }
        })
      });
      `
    }
  ]
});

pluginTester({
  plugin,
  title: 'New module imports',
  snapshot: false,
  filename: __filename,
  tests: [
    {
      title: 'Import computed from @ember/object',
      code: `
      import { computed } from '@ember/object';
      import { variation } from 'ember-launch-darkly';

      export default Component.extend({
        foo: computed(function() {
          if(variation('bar')) {
            return null;
          }
        })
      });
      `,
      output: `
      import { default as launchDarklyService } from 'ember-service/inject';
      import { computed } from '@ember/object';


      export default Component.extend({
        launchDarkly: launchDarklyService(),

        foo: computed('launchDarkly.bar', function () {
          const launchDarkly = this.get('launchDarkly');

          if (launchDarkly.get('bar')) {
            return null;
          }
        })
      });
      `
    },
    {
      title: 'Import computed from ember-computed',
      code: `
      import computed from 'ember-computed';
      import { variation } from 'ember-launch-darkly';

      export default Component.extend({
        foo: computed(function() {
          if(variation('bar')) {
            return null;
          }
        })
      });
      `,
      output: `
      import { default as launchDarklyService } from 'ember-service/inject';
      import computed from 'ember-computed';


      export default Component.extend({
        launchDarkly: launchDarklyService(),

        foo: computed('launchDarkly.bar', function () {
          const launchDarkly = this.get('launchDarkly');

          if (launchDarkly.get('bar')) {
            return null;
          }
        })
      });
      `
    },
    {
      title: 'Define computed with const { computed } = Ember;',
      code: `
      const { computed } = Ember;
      import { variation } from 'ember-launch-darkly';

      export default Component.extend({
        foo: computed(function() {
          if(variation('bar')) {
            return null;
          }
        })
      });
      `,
      output: `
      import { default as launchDarklyService } from 'ember-service/inject';
      const { computed } = Ember;


      export default Component.extend({
        launchDarkly: launchDarklyService(),

        foo: computed('launchDarkly.bar', function () {
          const launchDarkly = this.get('launchDarkly');

          if (launchDarkly.get('bar')) {
            return null;
          }
        })
      });
      `
    },
    {
      title: 'Define computed with var computed = Ember.computed;',
      code: `
      var computed = Ember.computed;
      import { variation } from 'ember-launch-darkly';

      export default Component.extend({
        foo: computed(function() {
          if(variation('bar')) {
            return null;
          }
        })
      });
      `,
      output: `
      import { default as launchDarklyService } from 'ember-service/inject';
      var computed = Ember.computed;


      export default Component.extend({
        launchDarkly: launchDarklyService(),

        foo: computed('launchDarkly.bar', function () {
          const launchDarkly = this.get('launchDarkly');

          if (launchDarkly.get('bar')) {
            return null;
          }
        })
      });
      `
    }
  ]
});

pluginTester({
  plugin,
  title: 'Code that should not be transformed',
  snapshot: false,
  tests: [
    {
      title: 'An Object creation that does not include a reference to the variation helper',
      code: `
      import Ember from 'ember';
      import Resolver from './resolver';
      import loadInitializers from 'ember-load-initializers';
      import config from './config/environment';

      let App;

      Ember.MODEL_FACTORY_INJECTIONS = true;

      App = Ember.Application.extend({
          modulePrefix: config.modulePrefix,
          podModulePrefix: config.podModulePrefix,
          Resolver
      });

      loadInitializers(App, config.modulePrefix);

      export default App;
      `
    }
  ]
});
