import Service from 'ember-service';
import getOwner from 'ember-owner/get';
import RSVP from 'rsvp';
import { assert } from 'ember-metal/utils';
import { warn } from 'ember-debug';
import run from 'ember-runloop';
import computed from 'ember-computed';
import Ember from 'ember';
import EmberObject from 'ember-object';

import NullClient from 'ember-launch-darkly/lib/null-client';

export default Service.extend({
  _client: null,
  _allFlags: null,

  init() {
    this._super(...arguments);
    this.set('_allFlags', EmberObject.create({}));
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

    return RSVP.resolve()
      .then(() => this._initialize(clientSideId, user))
      .then(() => this._updateLocalFlags())
      .then(() => this._registerComputedProperties());
  },

  identify(user) {
    return RSVP.resolve()
      .then(() => this._identify(user))
      .then(() => this._updateLocalFlags());
  },

  allFlags() {
    return this.get('_client').allFlags();
  },

  variation(key) {
    return this.get('_client').variation(key, false);
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

  _updateLocalFlags() {
    this.get('_allFlags').setProperties(this.allFlags());
    return RSVP.resolve();
  },

  _registerComputedProperties() {
    Object.keys(this.get('_allFlags')).forEach(key => {
      Ember.defineProperty(this, key, computed(`_allFlags.${key}`, () => {
        return this.variation(key);
      }));
    });

    return RSVP.resolve();
  },

  _identify(user) {
    return new RSVP.Promise(resolve => {
      this.get('_client').identify(user, null, resolve);
    })
  }
});
