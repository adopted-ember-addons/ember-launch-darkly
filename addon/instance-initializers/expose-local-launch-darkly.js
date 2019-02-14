import { assign } from '@ember/polyfills';

export function initialize(appInstance) {
  let appConfig = appInstance.resolveRegistration('config:environment') || {};

  const defaults = {
    local: appConfig.environment !== 'production'
  };

  let config = appConfig.launchDarkly || {};
  config = assign({}, defaults, config);

  if (config.local) {
    Object.defineProperty(window, 'ld', {
      writable: true,
      value: appInstance.lookup('service:launch-darkly-client')
    });
  }
}

export default {
  name: 'expose-local-launch-darkly',
  initialize: initialize
};

