import Service from 'ember-service';
import getOwner from 'ember-owner/get';
import RSVP from 'rsvp';
import { assert } from 'ember-metal/utils';
import { warn } from 'ember-debug';
import run from 'ember-runloop';
import computed from 'ember-computed';
import Ember from 'ember';

import NullClient from 'ember-launch-darkly/lib/null-client';

const NON_EXISTANT_FLAG_VALUE = 'LD_FLAG_NON_EXISTANT';
const DEFAULT_FLAG_VALUE = false;

export default Service.extend({
  _client: null,
  _seenFlags: null,

  init() {
    this._super(...arguments);
    this._seenFlags = new window.Set();
  },

  initialize(user = {}/*, options = {}*/) {
    let { clientSideId } = this._config();

    assert('ENV.launchDarkly.clientSideId must be specified in config/environment.js', clientSideId);

    if (!clientSideId) {
      warn('ENV.launchDarkly.clientSideId not specified. Defaulting all feature flags to "false"', false, { id: 'ember-launch-darkly.client-id-not-specified' });

      this.set('_client', NullClient);

      return RSVP.resolve();
    }

    assert('user.key must be specified in initilize payload', user.key);

    if (!user.key) {
      warn('user.key not specified in initialize payload. Defaulting all feature flags to "false"', false, { id: 'ember-launch-darkly.user-key-not-specified' });

      this.set('_client', NullClient);

      return RSVP.resolve();
    }

    if (!window.LDClient) {
      warn('Launch Darkly JS client not found. Defaulting all feature flags to "false"', false, { id: 'ember-launch-darkly.client-not-found' });

      this.set('_client', NullClient);

      return RSVP.resolve();
    }

    return this._initialize(clientSideId, user);
  },

  identify(user) {
    return RSVP.resolve()
      .then(() => this._identify(user))
      .then(() => this._notifyFlagUpdates());
  },

  allFlags() {
    return this.get('_client').allFlags();
  },

  variation(key) {
    let nonExistantFlagValue = `${NON_EXISTANT_FLAG_VALUE}: ${key}`;
    let value = this.get('_client').variation(key, nonExistantFlagValue);

    if (value === nonExistantFlagValue) {
      warn(`Feature flag with key '${key}' has not been defined. Returning default value of '${DEFAULT_FLAG_VALUE}'`, false, { id: 'ember-launch-darkly.feature-flag-not-defined' });

      return DEFAULT_FLAG_VALUE;
    }

    return value;
  },

  _config() {
    let appConfig = getOwner(this).resolveRegistration('config:environment');

    return appConfig.launchDarkly || {};
  },

  _initialize(id, user/*, options*/) {
    return new RSVP.Promise((resolve, reject) => {
      let client = window.LDClient.initialize(id, user/*, options*/);

      client.on('ready', () => {
        this.set('_client', client);
        run(null, resolve);
      });

      run.later(this, () => {
        if (!this.get('_client')) {
          run(null, reject);
        }
      }, 10000);
    })
  },

  _identify(user) {
    return new RSVP.Promise(resolve => {
      this.get('_client').identify(user, null, resolve);
    })
  },

  _notifyFlagUpdates() {
    this._seenFlags.forEach(key => this.notifyPropertyChange(key));
    return RSVP.resolve();
  },

  _registerComputedProperty(key) {
    Ember.defineProperty(this, key, computed(() => {
      return this.variation(key);
    }));
  },

  unknownProperty(key) {
    this._seenFlags.add(key);
    this._registerComputedProperty(key);
    return this.variation(key);
  }
});
