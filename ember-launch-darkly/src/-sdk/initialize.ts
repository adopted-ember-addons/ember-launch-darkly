import { isNone } from '@ember/utils';
import { warn } from '@ember/debug';

import * as LDClient from 'launchdarkly-js-client-sdk';

import Context, { getCurrentContext, setCurrentContext } from './context.ts';

type StreamingConfig = { allExcept?: Array<string>; [key: string]: unknown };

export interface EmberLaunchDarklyOptions
  extends Omit<LDClient.LDOptions, 'bootstrap'> {
  bootstrap?: 'localFlags' | LDClient.LDOptions['bootstrap'];
  localFlags?: Record<string, unknown>;
  mode?: string;
  sendEventsOnlyForVariation?: boolean;
  streamingFlags?: boolean;

  /**
   * Timeout in seconds for `waitForInitialization()`. If the SDK does not
   * initialize within this time, the promise will be rejected and the app
   * will continue with bootstrap/default flag values.
   *
   * @default 5
   */
  timeout?: number;
}

export function shouldUpdateFlag(
  key: string,
  streamingConfig?: StreamingConfig | boolean,
) {
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

export async function initialize(
  clientSideId: string,
  user = {},
  options: EmberLaunchDarklyOptions = {},
) {
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
    timeout = 5,
    ...rest
  } = options;
  let { mode = 'local' } = options;

  if (!['local', 'remote'].includes(mode)) {
    warn(
      `"config.mode" must be set to either "local" or "remote". Defaulting to "local". (Invalid value: "${mode}")`,
      false,
      { id: 'ember-launch-darkly.invalid-config-property.mode' },
    );

    mode = 'local';
  }

  if (mode === 'local') {
    const context = new Context(localFlags);
    setCurrentContext(context);

    return;
  }

  options = {
    sendEventsOnlyForVariation: true,
    ...rest,
  };

  if (options.bootstrap === 'localFlags' && !isNone(localFlags)) {
    options.bootstrap = localFlags;
  }

  const client = LDClient.initialize(
    clientSideId,
    user,
    options as LDClient.LDOptions,
  );

  try {
    await client.waitForInitialization(timeout);
  } catch (error) {
    warn(
      `LaunchDarkly SDK failed to initialize within ${String(timeout)}s. Using ${options.bootstrap ? 'bootstrap' : 'default'} flag values. Error: ${String(error)}`,
      false,
      { id: 'ember-launch-darkly.initialization-timeout' },
    );
  }

  client.on('change', (updates: Record<string, unknown>) => {
    const context = getCurrentContext();

    if (!context) {
      return;
    }

    const flagsToUpdate: Record<string, unknown> = {};
    // @ts-expect-error TODO: fix this type error
    for (const [key, { current }] of Object.entries(updates)) {
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
