import RemoteClient from 'ember-launch-darkly/services/launch-darkly-client-remote';
import LocalClient from 'ember-launch-darkly/services/launch-darkly-client-local';

export function initialize(application) {
  let appConfig = application.resolveRegistration('config:environment') || {};

  const defaults = {
    local: appConfig.environment !== 'production'
  };

  let config = appConfig.launchDarkly || {};
  config = { ...defaults, ...config };

  let Factory = config.local ? LocalClient : RemoteClient;

  application.register('service:launch-darkly-client', Factory);

  ['route', 'controller', 'component', 'router:main'].forEach(type => {
    application.inject(type, 'launchDarkly', 'service:launch-darkly');
  });
}

export default {
  name: 'launch-darkly',
  initialize: initialize
};
