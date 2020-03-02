import Service from '@ember/service';
import { getOwner } from '@ember/application';
import { assert, warn } from '@ember/debug';
import { run } from '@ember/runloop';
import Evented from '@ember/object/evented';
import * as LDClient from 'launchdarkly-js-client-sdk';

import RSVP from 'rsvp';

import NullClient from 'ember-launch-darkly/lib/null-client';

export default Service.extend(Evented, {
  _client: null,

  init() {
    this._super(...arguments);
  },

  initialize(user = {}) {
    let { clientSideId, streaming = false } = this._config();

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

    if (!LDClient) {
      warn('Launch Darkly JS client not found. Defaulting all feature flags to "false"', false, { id: 'ember-launch-darkly.client-not-found' });

      this.set('_client', NullClient);

      return RSVP.resolve();
    }

    return this._initialize(clientSideId, user, streaming);
  },

  identify(user) {
    return this._identify(user);
  },

  allFlags() {
    return this.get('_client').allFlags();
  },

  variation(key, defaultValue) {
    return this.get('_client').variation(key, defaultValue);
  },

  _config() {
    let appConfig = getOwner(this).resolveRegistration('config:environment');

    return appConfig.launchDarkly || {};
  },

  _initialize(id, user, streamingOptions) {
    return new RSVP.Promise((resolve, reject) => {
      let client = LDClient.initialize(id, user);

      client.on('ready', () => {
        this.set('_client', client);
        run(null, resolve);
      });

      client.on('change', settings => {
        Object.keys(settings).forEach(key => {
          if (this._shouldTriggerEvent(key, streamingOptions)) {
            this.trigger(key);
          }
        });
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

  _shouldTriggerEvent(key, streamingOptions) {
    if (streamingOptions === true) {
      return true;
    }

    if (typeof streamingOptions === 'object') {
      if (streamingOptions.allExcept && Array.isArray(streamingOptions.allExcept)) {
        return streamingOptions.allExcept.indexOf(key) === -1;
      }

      return streamingOptions[key];
    }

    return false;
  }
});
