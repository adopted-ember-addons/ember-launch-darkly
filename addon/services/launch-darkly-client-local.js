import Service from 'ember-service';
import getOwner from 'ember-owner/get';
import RSVP from 'rsvp';
import Evented from 'ember-evented';
import { assign } from 'ember-platform';

export default Service.extend(Evented, {
  _allFlags: null,
  _user: null,

  init() {
    this._super(...arguments);

    let { localFeatureFlags } = this._config();
    localFeatureFlags = localFeatureFlags || {}

    this._allFlags = localFeatureFlags;
  },

  initialize(user) {
    return this.identify(user);
  },

  identify(user) {
    this._user = user;
    return RSVP.resolve();
  },

  allFlags() {
    return assign({}, this._allFlags);
  },

  variation(key, defaultValue = false) {
    if (this._allFlags.hasOwnProperty(key)) {
      return this._allFlags[key];
    }

    return defaultValue;
  },

  enable(key) {
    this.setVariation(key, true);
  },

  disable(key) {
    this.setVariation(key, false);
  },

  setVariation(key, value) {
    this._allFlags[key] = value;
    this.trigger(key);
  },

  user() {
    return this._user;
  },

  _config() {
    let appConfig = getOwner(this).resolveRegistration('config:environment');
    let config = appConfig.launchDarkly || {};

    return assign({}, config);
  }
});
