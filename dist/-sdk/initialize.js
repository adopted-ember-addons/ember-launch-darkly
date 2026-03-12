import { warn } from '@ember/debug';
import * as LDClient from 'launchdarkly-js-client-sdk';
import Context, { getCurrentContext, setCurrentContext } from './context.js';

/**
 * Result returned by `initialize()`.
 *
 * Consumers can inspect this to decide how to handle initialization failures
 * without relying on try/catch.
 *
 * @example
 * ```ts
 * const result = await initialize(clientSideId, user, {
 *   mode: 'remote',
 *   timeout: 5,
 * });
 *
 * if (!result.isOk) {
 *   console.error('LD init failed:', result.error);
 * }
 * ```
 */

function shouldUpdateFlag(key, streamingConfig) {
  if (streamingConfig === true) {
    return true;
  }
  if (streamingConfig && typeof streamingConfig === 'object') {
    if (streamingConfig.allExcept) {
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
      const context = getCurrentContext();
      return {
        isOk: context.initSucceeded,
        status: context.initStatus,
        error: context.initError,
        context
      };
    }
  } catch {
    // `initialize` has not been run yet and so the current context doesn't
    // exist. Let's go ahead and create one.
  }
  const {
    streamingFlags = false,
    localFlags = {},
    timeout = 5,
    mode: initialMode = 'local',
    onStatusChange,
    onError,
    ...rest
  } = options;
  let mode = initialMode;
  if (!['local', 'remote'].includes(mode)) {
    warn(`"config.mode" must be set to either "local" or "remote". Defaulting to "local". (Invalid value: "${mode}")`, false, {
      id: 'ember-launch-darkly.invalid-config-property.mode'
    });
    mode = 'local';
  }
  if (mode === 'local') {
    const context = new Context({
      flags: localFlags,
      initStatus: 'local',
      onStatusChange,
      onError
    });
    setCurrentContext(context);
    return {
      isOk: true,
      status: 'local',
      context
    };
  }
  options = {
    sendEventsOnlyForVariation: true,
    wrapperName: 'ember-launch-darkly',
    wrapperVersion: "6.0.1" ,
    ...rest
  };
  if (options.bootstrap === 'localFlags' && localFlags) {
    options.bootstrap = localFlags;
  }
  const client = LDClient.initialize(clientSideId, user, options);
  let initStatus = 'initialized';
  let initError;
  try {
    await client.waitForInitialization(timeout);
  } catch (error) {
    initStatus = 'failed';
    initError = error;
    warn(`LaunchDarkly SDK failed to initialize within ${String(timeout)}s. Using ${options.bootstrap ? 'bootstrap' : 'default'} flag values. Error: ${String(error)}`, false, {
      id: 'ember-launch-darkly.initialization-timeout'
    });
  }
  const flags = client.allFlags();
  const context = new Context({
    flags,
    client,
    initStatus,
    initError,
    onStatusChange,
    onError
  });

  // Set context globally *before* registering event handlers so that
  // `getCurrentContext()` is available immediately — including when init
  // failed. This prevents a second `initialize()` call from creating a
  // duplicate client and ensures post-init recovery works automatically.
  setCurrentContext(context);
  client.on('error', error => {
    context.handleError(error);
  });
  client.on('change', updates => {
    // If we receive flag changes after a failed init, the SDK has recovered.
    // Transition to 'initialized' so the app can react.
    if (context.initStatus === 'failed') {
      context.transitionStatus('initialized');
    }
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
  return {
    isOk: initStatus === 'initialized',
    status: initStatus,
    error: initError,
    context
  };
}

export { initialize, shouldUpdateFlag };
//# sourceMappingURL=initialize.js.map
