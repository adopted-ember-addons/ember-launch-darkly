import { assign } from 'ember-platform';

function defineLdProperty(appInstance) {
  let define = value => Object.defineProperty(window, 'ld', { value, enumerable: true, writable: true });

  Object.defineProperty(window, 'ld', {
    configurable: true,
    enumerable: true,
    get() {
      let service = appInstance.lookup('service:launch-darkly-client');
      define(service);
      return service;
    },

    set(value) {
      define(value);
    }
  });
}

export function initialize(appInstance) {
  let appConfig = appInstance.resolveRegistration('config:environment') || {};

  const defaults = {
    local: appConfig.environment !== 'production'
  };

  let config = appConfig.launchDarkly || {};
  config = assign({}, defaults, config);

  if (config.local) {
    defineLdProperty(appInstance);
  }
}

export default {
  name: 'expose-local-launch-darkly',
  initialize: initialize
};

