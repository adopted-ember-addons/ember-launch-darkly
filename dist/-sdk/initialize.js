
import { isNone } from '@ember/utils';
import { warn } from '@ember/debug';
import * as LDClient from 'launchdarkly-js-client-sdk';
import Context, { getCurrentContext, setCurrentContext } from './context.js';

function shouldUpdateFlag(key, streamingConfig) {
  if (streamingConfig === true) {
    return true;
  }
  if (streamingConfig && typeof streamingConfig === 'object') {
    if (!isNone(streamingConfig.allExcept)) {
      if (Array.isArray(streamingConfig.allExcept)) {
        return !streamingConfig.allExcept.includes(key);
      }
      return false;
    }
    if (streamingConfig[key] && typeof streamingConfig[key] === 'boolean') {
      return streamingConfig[key];
    }
  }
  return false;
}
async function initialize(clientSideId, user = {}, options = {}) {
  try {
    if (getCurrentContext()) {
      return;
    }
  } catch {
    // `initialize` has not been run yet and so the current context doesn't
    // exist. Let's go ahead and create one.
  }
  const {
    streamingFlags = false,
    localFlags = {},
    ...rest
  } = options;
  let {
    mode = 'local'
  } = options;
  if (!['local', 'remote'].includes(mode)) {
    warn(`"config.mode" must be set to either "local" or "remote". Defaulting to "local". (Invalid value: "${mode}")`, false, {
      id: 'ember-launch-darkly.invalid-config-property.mode'
    });
    mode = 'local';
  }
  if (mode === 'local') {
    const context = new Context(localFlags);
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
  const client = LDClient.initialize(clientSideId, user, options);
  await client.waitForInitialization();
  client.on('change', updates => {
    const context = getCurrentContext();
    const flagsToUpdate = {};
    // @ts-expect-error TODO: fix this type error
    for (const [key, {
      current
    }] of Object.entries(updates)) {
      if (shouldUpdateFlag(key, streamingFlags)) {
        flagsToUpdate[key] = current;
      }
    }
    context.updateFlags(flagsToUpdate);
  });
  const flags = client.allFlags();
  const context = new Context(flags, client);
  setCurrentContext(context);
}

export { initialize, shouldUpdateFlag };
//# sourceMappingURL=initialize.js.map
