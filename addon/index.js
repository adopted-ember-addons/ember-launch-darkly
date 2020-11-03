import { DEBUG } from '@glimmer/env';

let variation;
if (DEBUG) {
  variation = () => {
    throw new Error(
      `

In order to use the "variation" Javascript helper, you must include the ember-launch-darkly babel plugin. See the README (link below) for more details on how this works and some considerations when using it.

https://github.com/ember-launch-darkly/ember-launch-darkly#experimental-variation-javascript-helper
`
    );
  };
}

export { variation };

export { computed as computedWithVariation } from '@ember/object';

import { initialize as initLaunchDarkly } from 'launchdarkly-js-client-sdk';
import { TrackedMap } from 'tracked-built-ins';

async function initialize(clientSideId, user = {}, options = {}) {
  if (window.__ELD__) {
    return;
  }

  let client = initLaunchDarkly(clientSideId, user, {
    sendEventsOnlyForVariation: true,
    allowFrequentDuplicateEvents: false
  });

  try {
    await client.waitForInitialization();
  } catch (e) {
    console.log('Handle this');
    throw e;
  }

  let hub = {
    flags: new TrackedMap(),
    client
  };

  let flags = client.allFlags();

  Object.entries(flags).forEach(([key, value]) => hub.flags.set(key, value));

  client.on('change', updates => {
    Object.entries(updates).forEach(([key, { current: value }]) =>
      hub.flags.set(key, value)
    );
  });

  window.__ELD__ = hub;

  return true;
}

function foobar(key) {
  if (!window.__ELD__) {
    throw new Error('LD not initialized');
  }

  let { client, flags } = window.__ELD__;

  client.variation(key);

  return flags.get(key);
}

export { initialize, foobar };
