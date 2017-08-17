import RemoteService from 'ember-launch-darkly/services/launch-darkly-remote';
import LocalService from 'ember-launch-darkly/services/launch-darkly-local';
import { assign } from 'ember-platform';

export function initialize(application) {
  let appConfig = application.resolveRegistration('config:environment') || {};

  const defaults = {
    local: appConfig.environment !== 'production'
  };

  let config = appConfig.launchDarkly || {};
  config = assign({}, defaults, config);

  let Factory = config.local ? LocalService : RemoteService;

  application.register('service:launch-darkly', Factory);
}

export default {
  name: 'launch-darkly',
  initialize: initialize
};
