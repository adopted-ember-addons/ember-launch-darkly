import { assign } from 'ember-platform';

export function initialize(appInstance) {
  let appConfig = appInstance.resolveRegistration('config:environment') || {};

  const defaults = {
    local: appConfig.environment !== 'production'
  };

  let config = appConfig.launchDarkly || {};
  config = assign({}, defaults, config);

  if (config.local) {
    let client = appInstance.lookup('service:launch-darkly-client');
    window.ld = client;
  }
}

export default {
  name: 'expose-local-launch-darkly',
  initialize: initialize
};

