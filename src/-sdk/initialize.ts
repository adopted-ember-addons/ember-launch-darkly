import { warn } from '@ember/debug';

import * as LDClient from 'launchdarkly-js-client-sdk';

import Context, {
  getCurrentContext,
  setCurrentContext,
  setPersistedFlags,
} from './context.ts';
import type { InitStatus, OnStatusChange, OnError } from './context.ts';

declare const __ADDON_VERSION__: string;

type StreamingConfig = { allExcept?: Array<string>; [key: string]: unknown };

export interface EmberLaunchDarklyOptions extends Omit<
  LDClient.LDOptions,
  'bootstrap'
> {
  bootstrap?: 'localFlags' | LDClient.LDOptions['bootstrap'];
  localFlags?: Record<string, unknown>;

  /**
   * Values `variation()` falls back to when a flag has no value (missing or
   * `null`): while LaunchDarkly is unreachable or hasn't recovered from a
   * failed initialization, or for flags it doesn't know. A `defaultValue`
   * passed to `variation()` takes precedence. Applies in local mode too.
   * Unlike `bootstrap`, these never count as flag values.
   */
  defaultFlags?: Record<string, unknown>;

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
   * Most useful for reacting to post-init **recovery**: when the flag request
   * finishes after `timeout`, or a later `identify()` succeeds, the callback
   * fires with `('initialized', 'failed')`.
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
    defaultFlags,
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
      defaultFlags,
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

  const loader = bootstrapLoader(rest.bootstrap, streamingFlags);

  if (loader) {
    options.inspectors = [...(options.inspectors ?? []), loader.inspector];
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
    defaultFlags,
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

  subscribeToClient(client, context, streamingFlags);

  if (initStatus === 'initialized') {
    loader?.loadInto(context, flags);
  }

  return {
    isOk: initStatus === 'initialized',
    status: initStatus,
    error: initError,
    context,
  };
}

/**
 * With `bootstrap: 'localFlags'` or `'localStorage'`, the SDK reports success
 * straight away from those values and only sends LaunchDarkly's as changes,
 * which `streamingFlags` may filter out. The returned inspector loads the
 * first full set of flags LaunchDarkly sends into the context, then stops. A
 * bootstrap object passed in directly is taken as LaunchDarkly's values.
 *
 * LaunchDarkly intends inspectors for monitoring, but 'flag-details-changed'
 * is the only signal that a full payload arrived, even when nothing changed.
 *
 * @internal
 */
export function bootstrapLoader(
  bootstrap: EmberLaunchDarklyOptions['bootstrap'],
  streamingFlags?: boolean | StreamingConfig,
) {
  const provisional =
    bootstrap === 'localFlags' ||
    (typeof bootstrap === 'string' &&
      bootstrap.toUpperCase() === 'LOCALSTORAGE');

  if (!provisional) {
    return undefined;
  }

  let target: Context<LDClient.LDFlagSet> | undefined;
  let startedFrom: LDClient.LDFlagSet = {};

  const inspector: LDClient.LDInspectionFlagDetailsChangedHandler = {
    type: 'flag-details-changed',
    name: 'ember-launch-darkly',
    method(details) {
      const context = target;

      if (!context || !awaitingFirstPayload.has(context)) {
        return;
      }

      target = undefined;
      awaitingFirstPayload.delete(context);

      if (getCurrentContext() !== context) {
        return;
      }

      // This runs a tick after the payload. A flag that streams may have been
      // patched since, so it gets the client's value; the rest keep the
      // payload's, as the 'change' handler would have filtered the patch.
      const current = context.client?.allFlags() ?? {};
      const flags = Object.fromEntries([
        ...Object.entries(details)
          .filter(
            ([key, { value }]) =>
              value !== undefined && !shouldUpdateFlag(key, streamingFlags),
          )
          .map(([key, { value }]) => [key, value] as const),
        ...Object.entries(current).filter(([key]) =>
          shouldUpdateFlag(key, streamingFlags),
        ),
      ]);

      // A cold cache already started from LaunchDarkly's values, and a warm
      // one usually matches them. Don't re-render every flag for nothing.
      if (!isEqual(flags, startedFrom)) {
        context.replaceFlags(flags);
        setPersistedFlags(context);
      }
    },
  };

  return {
    inspector,
    loadInto(context: Context<LDClient.LDFlagSet>, flags: LDClient.LDFlagSet) {
      target = context;
      startedFrom = flags;
      awaitingFirstPayload.add(context);
    },
  };
}

// Contexts still waiting for LaunchDarkly's first full payload after a
// bootstrapped start.
const awaitingFirstPayload = new WeakSet<object>();

/**
 * `identify()` loads the new user's flags itself, so a payload that arrives
 * afterwards isn't the startup one.
 *
 * @internal
 */
export function stopAwaitingFirstPayload(context: object) {
  awaitingFirstPayload.delete(context);
}

// Flag values are JSON: key order doesn't matter, array order does.
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a === null ||
    b === null ||
    Array.isArray(a) !== Array.isArray(b)
  ) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, i) => isEqual(value, b[i]));
  }

  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const keys = Object.keys(aRecord);

  return (
    keys.length === Object.keys(bRecord).length &&
    keys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(bRecord, key) &&
        isEqual(aRecord[key], bRecord[key]),
    )
  );
}

/**
 * Keep a context in sync with its LD client: forward SDK errors, apply
 * streamed flag changes, and recover after a failed initialization.
 *
 * @internal
 */
export function subscribeToClient(
  client: LDClient.LDClient,
  context: Context<LDClient.LDFlagSet>,
  streamingFlags?: boolean | StreamingConfig,
) {
  // Load flags the way a successful init does: everything the client has, not
  // just what `streamingFlags` lets through, then any persisted overrides.
  // A context that was destroyed or replaced in the meantime is left alone.
  const recover = () => {
    if (context.initStatus !== 'failed' || getCurrentContext() !== context) {
      return;
    }

    context.updateFlags(client.allFlags());
    setPersistedFlags(context);
    context.transitionStatus('initialized');
  };

  client.on('error', (error: Error) => {
    context.handleError(error);
  });

  // A flag request that outlives `timeout` still completes. The SDK then
  // stores the flags and fires 'initialized', but no 'change'.
  client.on('initialized', recover);

  client.on('change', (updates: Record<string, unknown>) => {
    // Flags arriving after a failed init, e.g. from `identify()`.
    if (context.initStatus === 'failed') {
      recover();
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
}
