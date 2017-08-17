import Service from 'ember-service';
import getOwner from 'ember-owner/get';
import RSVP from 'rsvp';

export default Service.extend({
  initialize(user) {
    let config = this._config();

    console.log('LOCAL', config);
  },

  _config() {
    let appConfig = getOwner(this).resolveRegistration('config:environment');

    return appConfig.launchDarkly || {};
  }
});
