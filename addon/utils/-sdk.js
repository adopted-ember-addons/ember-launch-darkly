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
    Object.entries(flags).forEach(([key, value]) => this.flags.set(key, value));
  }
}

async function initialize(
  clientSideId,
  user = {},
  options = {},
  ldClient = LDClient
) {
  let context = getCurrentContext();
  if (context) {
    return;
  }

  options = {
    sendEventsOnlyForVariation: true,
    ...options
  };

  let client = ldClient.initialize(clientSideId, user, options);

  await client.waitForInitialization();

  let flags = client.allFlags();

  context = new Context(client, flags);

  client.on('change', updates => {
    let flags = {};
    Object.entries(updates).forEach(([key, { current, previous }]) => {
      if (current !== previous) {
        flags[key] = current;
      }
    });

    context.updateFlags(flags);
  });

  setCurrentContext(context);
}

function variation(key) {
  let context = getCurrentContext();
  if (!context) {
    throw new Error('LD not initialized');
  }

  context.client.variation(key);

  return context.flags.get(key);
}

export { initialize, variation };
