/* eslint-env node */
module.exports = {
  useYarn: true,

  scenarios: [
    {
      name: 'ember-default',
      bower: {
        dependencies: { }
      }
    },
    {
      name: 'ember-release',
      bower: {
        dependencies: {
          ember: 'release'
        }
      }
    },
    {
      name: 'ember-beta',
      bower: {
        dependencies: {
          ember: 'beta'
        }
      }
    },
    {
      name: 'ember-canary',
      bower: {
        dependencies: {
          ember: 'canary'
        }
      }
    }
  ]
};
