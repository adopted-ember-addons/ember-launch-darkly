import { warn } from '@ember/debug';

import * as LDClient from 'launchdarkly-js-client-sdk';

import Context, { getCurrentContext, setCurrentContext } from './context.ts';

type StreamingConfig = { allExcept?: Array<string>; [key: string]: unknown };

export interface InitializeOptions {
  /** The LaunchDarkly client-side ID for your environment. */
  clientSideId: string;

  /** The user context to initialize with. Defaults to `{}` (anonymous). */
  user?: LDClient.LDContext;

  /**
   * Whether to run in `'local'` or `'remote'` mode.
   *
   * - `'local'` uses `localFlags` as static flag values (no network requests).
   * - `'remote'` connects to the LaunchDarkly service.
   *
   * @default 'local'
   */
  mode?: 'local' | 'remote';

  /** Static flag values used in local mode, or as bootstrap values in remote mode. */
  localFlags?: Record<string, unknown>;

  /**
   * Configure which flags should be updated via streaming.
   *
   * - `true` streams all flags.
   * - An object with flag keys set to `true` streams only those flags.
   * - An object with `allExcept: [...]` streams all flags except those listed.
   */
  streamingFlags?: StreamingConfig | boolean;

  /**
   * When set to `'localFlags'`, the SDK bootstraps from `localFlags` for
   * instant rendering while the remote connection is established.
   */
  bootstrap?: 'localFlags' | LDClient.LDFlagSet;

  /**
   * If `true`, only sends events to LaunchDarkly for flags evaluated via
   * `variation()`. Defaults to `true`.
   */
  sendEventsOnlyForVariation?: boolean;

  /**
   * Timeout in seconds for `waitForInitialization()`. If the SDK does not
   * initialize within this time, the promise will be rejected.
   *
   * @default 5
   */
  timeout?: number;

  /** Additional options passed directly to the LaunchDarkly JS SDK. */
  ldOptions?: Omit<LDClient.LDOptions, 'bootstrap'>;
}

export function shouldUpdateFlag(
  key: string,
  streamingConfig?: StreamingConfig | boolean,
) {
  if (streamingConfig === true) {
    return true;
  }

  if (streamingConfig && typeof streamingConfig === 'object') {
    if (streamingConfig.allExcept != null) {
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

export async function initialize(options: InitializeOptions) {
  if (getCurrentContext()) {
    return;
  }

  const {
    clientSideId,
    user = {},
    streamingFlags = false,
    localFlags = {},
    bootstrap,
    sendEventsOnlyForVariation = true,
    timeout = 5,
    ldOptions = {},
  } = options;

  let { mode = 'local' } = options;

  if (!['local', 'remote'].includes(mode)) {
    warn(
      `"mode" must be set to either "local" or "remote". Defaulting to "local". (Invalid value: "${mode}")`,
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

  const ldClientOptions: LDClient.LDOptions = {
    sendEventsOnlyForVariation,
    ...ldOptions,
  };

  if (bootstrap === 'localFlags' && localFlags != null) {
    ldClientOptions.bootstrap = localFlags;
  } else if (bootstrap && bootstrap !== 'localFlags') {
    ldClientOptions.bootstrap = bootstrap;
  }

  const client = LDClient.initialize(clientSideId, user, ldClientOptions);

  try {
    await client.waitForInitialization(timeout);
  } catch (error) {
    warn(
      `LaunchDarkly SDK failed to initialize within ${timeout}s. Using ${bootstrap === 'localFlags' ? 'bootstrap' : 'default'} flag values. Error: ${String(error)}`,
      false,
      { id: 'ember-launch-darkly.initialization-timeout' },
    );
  }

  client.on('change', (updates: LDClient.LDFlagChangeset) => {
    const context = getCurrentContext();

    if (!context) {
      return;
    }

    const flagsToUpdate: Record<string, unknown> = {};

    for (const [key, change] of Object.entries(updates)) {
      const current = (change as { current: unknown }).current;
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
