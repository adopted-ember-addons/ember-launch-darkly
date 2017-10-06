import RemoteClient from 'ember-launch-darkly/services/launch-darkly-client-remote';
import LocalClient from 'ember-launch-darkly/services/launch-darkly-client-local';
import { assign } from 'ember-platform';

export function initialize(application) {
  let appConfig = application.resolveRegistration('config:environment') || {};

  const defaults = {
    local: appConfig.environment !== 'production'
  };

  let config = appConfig.launchDarkly || {};
  config = assign({}, defaults, config);

  let Factory = config.local ? LocalClient : RemoteClient;

  application.register('service:launch-darkly-client', Factory);
}

export default {
  name: 'launch-darkly',
  initialize: initialize
};
