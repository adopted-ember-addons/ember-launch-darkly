import Service from 'ember-service';
import getOwner from 'ember-owner/get';
import RSVP from 'rsvp';
import { warn } from 'ember-debug';
import EmberObject from 'ember-object';
import computed from 'ember-computed';
import Ember from 'ember';

export default Service.extend({
  _allFlags: null,
  _user: null,

  init() {
    this._super(...arguments);

    let { localFeatureFlags } = this._config();
    localFeatureFlags = localFeatureFlags || {}

    if (typeof(localFeatureFlags) !== 'object' || Object.keys(localFeatureFlags).length === 0) {
      warn('ENV.launchDarkly.localFeatureFlags not specified for local use. Defaulting all feature flags to "false"');
      this.set('_allFlags', EmberObject.create({}));
    } else {
      this.set('_allFlags', EmberObject.create(localFeatureFlags));

      Object.keys(this.allFlags()).forEach(key => {
        Ember.defineProperty(this, key, computed(() => {
          return this.get(`_allFlags.${key}`);
        }));
      });
    }
  },

  initialize(user) {
    return this.identify(user);
  },

  identify(user) {
    this.set('_user', user);
    return RSVP.resolve();
  },

  allFlags() {
    return Object.assign({}, this.get('_allFlags'));
  },

  variation(key, value) {
    if (value !== undefined) {
      return this._setFlag(key, value);
    }

    return this._getFlag(key);
  },

  enable(key) {
    return this._setFlag(key, true);
  },

  disable(key) {
    return this._setFlag(key, false);
  },

  user() {
    return this.get('_user');
  },

  _config() {
    let appConfig = getOwner(this).resolveRegistration('config:environment');
    let config = appConfig.launchDarkly || {};

    if (appConfig.environment === 'test' && config.localFeatureFlags) {
      warn('Ember is running in `test` mode. Defaulting all feature flags to "false"');

      Object.keys(config.localFeatureFlags).forEach(key => {
        config.localFeatureFlags[key] = false;
      });
    }

    return config;
  },

  _setFlag(key, value) {
    return this.set(key, value);
  },

  _getFlag(key) {
    return this.get(key);
  }
});
