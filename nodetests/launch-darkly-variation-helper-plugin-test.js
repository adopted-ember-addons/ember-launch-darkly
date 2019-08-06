const pluginTester = require('babel-plugin-tester');
const plugin = require('../launch-darkly-variation-helper');

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
      import { variation } from 'ember-launch-darkly';

      export default Component.extend({
        foo: Ember.computed(function() {
          if(variation('bar')) {
            return null;
          }
        })
      });
      `,
      output: `
      export default Component.extend({
        ldService: Ember.inject.service("launchDarkly"),
        foo: Ember.computed("ldService.bar", function () {
          if (this.get("ldService.bar")) {
            return null;
          }
        })
      });
      `
    },
    {
      title: 'Export variable declaration as default',
      code: `
      import { variation } from 'ember-launch-darkly';

      const Thing = Component.extend({
        foo: Ember.computed(function() {
          if(variation('bar')) {
            return null;
          }
        })
      });

      export default Thing;
      `,
      output: `
      const Thing = Component.extend({
        ldService: Ember.inject.service("launchDarkly"),
        foo: Ember.computed("ldService.bar", function () {
          if (this.get("ldService.bar")) {
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
      import { variation } from 'ember-launch-darkly';

      const Thing = Component.extend({
        foo: Ember.computed(function() {
          if(variation('bar')) {
            return null;
          }
        })
      });

      export { Thing };
      `,
      output: `
      const Thing = Component.extend({
        ldService: Ember.inject.service("launchDarkly"),
        foo: Ember.computed("ldService.bar", function () {
          if (this.get("ldService.bar")) {
            return null;
          }
        })
      });
      export { Thing };
      `
    },
    {
      title: 'Include mixins in object',
      code: `
      import { variation } from 'ember-launch-darkly';
      import SomeMixin from 'somewhere';

      export default Component.extend(SomeMixin, {
        foo: Ember.computed(function() {
          if(variation('bar')) {
            return null;
          }
        })
      });
      `,
      output: `
      import SomeMixin from 'somewhere';
      export default Component.extend(SomeMixin, {
        ldService: Ember.inject.service("launchDarkly"),
        foo: Ember.computed("ldService.bar", function () {
          if (this.get("ldService.bar")) {
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
      import Ember from 'ember';
      import { variation as foo } from 'ember-launch-darkly';

      export default Component.extend({
        foo: Ember.computed(function() {
          if(foo('bar')) {
            return null;
          }
        })
      });
      `,
      output: `
      import Ember from 'ember';
      export default Component.extend({
        ldService: Ember.inject.service("launchDarkly"),
        foo: Ember.computed("ldService.bar", function () {
          if (this.get("ldService.bar")) {
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
