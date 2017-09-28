import Service from 'ember-service';
import service from 'ember-service/inject';
import computed from 'ember-computed';

const NON_EXISTANT_FLAG_VALUE = 'LD_FLAG_NON_EXISTANT';
const DEFAULT_FLAG_VALUE = false;

export default Service.extend({
  _seenFlags: null,

  _client: service('launchDarklyClient'),

  init() {
    this._super(...arguments);
    this._seenFlags = new window.Set();
  },

  initialize(user = {}/*, options = {}*/) {
    return this.get('_client').initialize(user);
  },

  identify(user) {
    return this.get('_client').identify(user);
  },

  allFlags() {
    return this.get('_client').allFlags();
  },

  variation(key, defaultValue = false) {
    let nonExistantFlagValue = `${NON_EXISTANT_FLAG_VALUE}: ${key}`;
    let value = this.get('_client').variation(key, nonExistantFlagValue);

    if (value === nonExistantFlagValue) {
      warn(`Feature flag with key '${key}' has not been defined. Returning default value of '${defaultValue}'`, false, { id: 'ember-launch-darkly.feature-flag-not-defined' });

      return defaultValue;
    }

    return value;
  },

  _registerComputedProperty(key) {
    Ember.defineProperty(this, key, computed(() => {
      return this.variation(key);
    }));
  },

  _registerSubscription(key) {
    this.get('_client').on(key, () => {
      this.notifyPropertyChange(key);
    })
  },

  unknownProperty(key) {
    this._seenFlags.add(key);
    this._registerComputedProperty(key);
    this._registerSubscription(key);
    return this.variation(key);
  }
});
