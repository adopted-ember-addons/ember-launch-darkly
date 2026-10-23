import { warn } from '@ember/debug';

import * as LDClient from 'launchdarkly-js-client-sdk';

import Context, { getCurrentContext, setCurrentContext } from './context.ts';
import type { InitStatus, OnStatusChange, OnError } from './context.ts';

declare const __ADDON_VERSION__: string;

type StreamingConfig = { allExcept?: Array<string>; [key: string]: unknown };

export interface EmberLaunchDarklyOptions extends Omit<
  LDClient.LDOptions,
  'bootstrap'
> {
  bootstrap?: 'localFlags' | LDClient.LDOptions['bootstrap'];
  localFlags?: Record<string, unknown>;
  mode?: string;
  sendEventsOnlyForVariation?: boolean;
  streamingFlags?: boolean | StreamingConfig;

  /**
   * Timeout in seconds for `waitForInitialization()`. If the SDK does not
   * initialize within this time, the promise will be rejected and the app
   * will continue with bootstrap/default flag values.
   *
   * @default 5
   */
  timeout?: number;

  /**
   * Callback invoked when the initialization status changes.
   *
   * Most useful for reacting to post-init **recovery**: when the LD SDK
   * reconnects after a failed initialization, the callback fires with
   * `('initialized', 'failed')`.
   *
   * @example
   * ```ts
   * await initialize(clientSideId, user, {
   *   onStatusChange(newStatus, previousStatus) {
   *     if (newStatus === 'initialized' && previousStatus === 'failed') {
   *       console.log('LaunchDarkly recovered!');
   *     }
   *   },
   * });
   * ```
   */
  onStatusChange?: OnStatusChange;

  /**
   * Callback invoked when the LD SDK emits a runtime error (e.g. stream
   * disconnection, network failure).
   *
   * If not provided, errors are logged via `@ember/debug`'s `warn()`. The
   * most recent error is always available on `context.lastError`.
   */
  onError?: OnError;
}

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
export interface InitializeResult {
  /** Whether initialization completed successfully (`true` for both remote success and local mode). */
  isOk: boolean;

  /** How initialization completed: `'initialized'`, `'failed'`, or `'local'`. */
  status: InitStatus;

  /** The error from `waitForInitialization()` if it failed, otherwise `undefined`. */
  error?: unknown;

  /** The LaunchDarkly context. Use this to access reactive state, SDK passthroughs, etc. */
  context: Context<Record<string, unknown>>;
}

export function shouldUpdateFlag(
  key: string,
  streamingConfig?: StreamingConfig | boolean,
) {
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

export async function initialize(
  clientSideId: string,
  user = {},
  options: EmberLaunchDarklyOptions = {},
): Promise<InitializeResult> {
  try {
    if (getCurrentContext()) {
      const context = getCurrentContext()!;
      return {
        isOk: context.initSucceeded,
        status: context.initStatus,
        error: context.initError,
        context,
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
    warn(
      `"config.mode" must be set to either "local" or "remote". Defaulting to "local". (Invalid value: "${mode}")`,
      false,
      { id: 'ember-launch-darkly.invalid-config-property.mode' },
    );

    mode = 'local';
  }

  if (mode === 'local') {
    const context = new Context({
      flags: localFlags,
      initStatus: 'local',
      onStatusChange,
      onError,
    });
    setCurrentContext(context);

    return { isOk: true, status: 'local', context };
  }

  options = {
    sendEventsOnlyForVariation: true,
    wrapperName: 'ember-launch-darkly',
    wrapperVersion:
      typeof __ADDON_VERSION__ !== 'undefined' ? __ADDON_VERSION__ : undefined,
    ...rest,
  };

  if (options.bootstrap === 'localFlags' && localFlags) {
    options.bootstrap = localFlags;
  }

  const client = LDClient.initialize(
    clientSideId,
    user,
    options as LDClient.LDOptions,
  );

  let initStatus: InitStatus = 'initialized';
  let initError: unknown;

  try {
    await client.waitForInitialization(timeout);
  } catch (error) {
    initStatus = 'failed';
    initError = error;

    warn(
      `LaunchDarkly SDK failed to initialize within ${String(timeout)}s. Using ${options.bootstrap ? 'bootstrap' : 'default'} flag values. Error: ${String(error)}`,
      false,
      { id: 'ember-launch-darkly.initialization-timeout' },
    );
  }

  const flags = client.allFlags();

  const context = new Context({
    flags,
    client,
    initStatus,
    initError,
    onStatusChange,
    onError,
  });

  // Set context globally *before* registering event handlers so that
  // `getCurrentContext()` is available immediately — including when init
  // failed. This prevents a second `initialize()` call from creating a
  // duplicate client and ensures post-init recovery works automatically.
  setCurrentContext(context);

  client.on('error', (error: Error) => {
    context.handleError(error);
  });

  client.on('change', (updates: Record<string, unknown>) => {
    // If we receive flag changes after a failed init, the SDK has recovered.
    // Transition to 'initialized' so the app can react.
    if (context.initStatus === 'failed') {
      context.transitionStatus('initialized');
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

  return {
    isOk: initStatus === 'initialized',
    status: initStatus,
    error: initError,
    context,
  };
}
