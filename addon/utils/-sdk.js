import { isNone, typeOf } from '@ember/utils';
import { warn } from '@ember/debug';

import * as LDClient from 'launchdarkly-js-client-sdk';
import { TrackedMap } from 'tracked-maps-and-sets';

function setCurrentContext(context) {
  window.__LD__ = context;
}

function getCurrentContext() {
  return window.__LD__;
}

class Context {
  _flags = new TrackedMap();
  _client = null;

  constructor(flags = {}, client) {
    this._client = client;

    this.updateFlags(flags);
  }

  updateFlags(flags) {
    Object.entries(flags).forEach(([key, value]) => {
      this._flags.set(key, value);
    });
  }

  enable(key) {
    this._flags.set(key, true);
  }

  disable(key) {
    this._flags.set(key, false);
  }

  set(key, value) {
    this._flags.set(key, value);
  }

  get(key) {
    return this._flags.get(key);
  }

  get allFlags() {
    let allFlags = {};

    for (let [key, value] of this._flags.entries()) {
      allFlags[key] = value;
    }

    return allFlags;
  }

  get isLocal() {
    return isNone(this.client);
  }

  get client() {
    return this._client;
  }
}

async function initialize(clientSideId, user = {}, options = {}) {
  let context = getCurrentContext();
  if (context) {
    return;
  }

  let { streamingFlags, localFlags, mode = 'remote', ...rest } = options;

  if (!['local', 'remote'].includes(mode)) {
    warn(
      `"config.mode" must either be set to either "local" or "remote". Defaulting to "remote". (Invalid value: "${mode}")`,
      false,
      { id: 'ember-launch-darkly.invalid-config-property.mode' }
    );

    mode = 'remote';
  }

  if (mode === 'local') {
    context = new Context(localFlags);
    setCurrentContext(context);

    return;
  }

  options = {
    sendEventsOnlyForVariation: true,
    ...rest
  };

  if (options.bootstrap === 'localFlags' && !isNone(localFlags)) {
    options.bootstrap = localFlags;
  }

  let client = LDClient.initialize(clientSideId, user, options);

  await client.waitForInitialization();

  let flags = client.allFlags();

  context = new Context(flags, client);

  client.on('change', updates => {
    let flagsToUpdate = {};
    Object.entries(updates).forEach(([key, { current }]) => {
      if (shouldUpdateFlag(key, streamingFlags)) {
        flagsToUpdate[key] = current;
      }
    });

    context.updateFlags(flagsToUpdate);
  });

  setCurrentContext(context);
}

function shouldUpdateFlag(key, streamingConfig) {
  if (streamingConfig === true) {
    return true;
  }

  if (typeOf(streamingConfig) === 'object') {
    if (!isNone(streamingConfig.allExcept)) {
      if (typeOf(streamingConfig.allExcept) === 'array') {
        return !streamingConfig.allExcept.includes(key);
      }

      return false;
    }

    if (typeOf(streamingConfig[key]) === 'boolean') {
      return streamingConfig[key];
    }
  }

  return false;
}

function variation(key) {
  let context = getCurrentContext();
  if (!context) {
    throw new Error(
      'Launch Darkly has not been initialized. Ensure that you run the `initialize` function before `varitaion`.'
    );
  }

  if (!context.isLocal) {
    context.client.variation(key);
  }

  return context.get(key);
}

export { initialize, variation, shouldUpdateFlag };
