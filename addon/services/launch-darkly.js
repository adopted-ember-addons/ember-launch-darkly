import Service, { inject as service } from '@ember/service';
import { computed, defineProperty } from '@ember/object';
import { warn } from '@ember/debug';
import RSVP from 'rsvp';

const NON_EXISTANT_FLAG_VALUE = 'LD_FLAG_NON_EXISTANT';

export default Service.extend({
  _seenFlags: null,

  _client: service('launchDarklyClient'),

  init() {
    this._super(...arguments);
    this._seenFlags = [];
  },

  initialize(user = {}, options = {}) {
    return this.get('_client').initialize(user, options);
  },

  identify(user) {
    return this.get('_client').identify(user)
      .then(() => this._notifyFlagUpdates());
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
    let self = this;
    defineProperty(this, key, computed(function() {
      return self.variation(key);
    }));
  },

  _registerSubscription(key) {
    this.get('_client').on(key, () => {
      this.notifyPropertyChange(key);
    })
  },

  _notifyFlagUpdates() {
    this._seenFlags.forEach(key => this.notifyPropertyChange(key));
    return RSVP.resolve();
  },

  unknownProperty(key) {
    if (this._seenFlags.indexOf(key) === -1) {
      this._seenFlags.push(key);
    }
    this._registerComputedProperty(key);
    this._registerSubscription(key);
    return this.variation(key);
  }
});
