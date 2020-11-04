import { isNone, typeOf } from '@ember/utils';
import * as LDClient from 'launchdarkly-js-client-sdk';
import { TrackedMap } from 'tracked-built-ins';

function setCurrentContext(context) {
  window.__LD__ = context;
}

function getCurrentContext() {
  return window.__LD__;
}

class Context {
  flags = new TrackedMap();
  client = null;

  constructor(client, flags = {}) {
    this.client = client;

    this.updateFlags(flags);
  }

  updateFlags(flags) {
    Object.entries(flags).forEach(([key, value]) => {
      this.flags.set(key, value);
    });
  }
}

async function initialize(clientSideId, user = {}, options = {}) {
  let context = getCurrentContext();
  if (context) {
    return;
  }

  let { streamingFlags, localFlags, ...rest } = options;

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

  context = new Context(client, flags);

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

  context.client.variation(key);

  return context.flags.get(key);
}

export { initialize, variation, shouldUpdateFlag };
