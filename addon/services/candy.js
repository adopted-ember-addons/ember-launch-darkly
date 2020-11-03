import Service from '@ember/service';
import { getOwner } from '@ember/application';

import { TrackedMap } from 'tracked-built-ins';
import { initialize } from 'launchdarkly-js-client-sdk';

export default class CandyService extends Service {
  _client = null;

  _flags = new TrackedMap();

  async initialize() {
    let { clientSideId, streaming = false } = this.config;

    let client = initialize(
      clientSideId,
      { key: 'CHEESE' },
      { sendEventsOnlyForVariation: true, allowFrequentDuplicateEvents: false }
    );

    try {
      await client.waitForInitialization();
      this._client = client;
    } catch (e) {
      debugger;
    }

    window.__LD__ = client;

    let flags = client.allFlags();

    Object.entries(flags).forEach(([key, value]) =>
      this._flags.set(key, value)
    );

    client.on('change', updates => {
      Object.entries(updates).forEach(([key, { current: value }]) =>
        this._flags.set(key, value)
      );
    });
  }

  variation(key) {
    this._client.variation(key);

    return this._flags.get(key);
  }

  get config() {
    let appConfig = getOwner(this).resolveRegistration('config:environment');

    return appConfig.launchDarkly || {};
  }
}
