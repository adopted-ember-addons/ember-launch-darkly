import { warn } from '@ember/debug';
import { tracked } from '@glimmer/tracking';
import { TrackedMap } from 'tracked-built-ins';
import type {
  LDClient,
  LDEvaluationDetail,
  LDFlagSet,
  LDFlagValue,
} from 'launchdarkly-js-client-sdk';

const STORAGE_KEY = 'ember-launch-darkly';

/**
 * Describes how initialization completed (or recovered).
 *
 * - `'initialized'` — LD SDK initialized successfully, flags are live.
 * - `'failed'`      — LD SDK failed to initialize (timeout, network error, etc.).
 *                      Flags come from bootstrap/allFlags and may be empty.
 * - `'local'`       — Running in local mode with `localFlags`.
 */
export type InitStatus = 'initialized' | 'failed' | 'local';

/**
 * Callback invoked whenever the {@link InitStatus} of the context changes.
 *
 * This is most useful for reacting to post-init recovery: when the LD SDK
 * reconnects after a failed initialization, the status transitions from
 * `'failed'` to `'initialized'`.
 */
export type OnStatusChange = (
  newStatus: InitStatus,
  previousStatus: InitStatus,
) => void;

/**
 * Callback invoked whenever the LD SDK emits a runtime error.
 *
 * If you do not provide this callback, errors are logged via `@ember/debug`'s
 * `warn()`. If you do, errors are forwarded to your callback instead.
 */
export type OnError = (error: Error) => void;

/**
 * Options for constructing a {@link Context}.
 *
 * All properties are optional — a bare `new Context()` produces a valid
 * local-mode context with no flags.
 */
export interface ContextOptions<ELDFlagSet extends LDFlagSet = LDFlagSet> {
  /** Initial flag values. */
  flags?: ELDFlagSet;

  /** The underlying LD client (omit for local mode). */
  client?: LDClient;

  /** How initialization completed. Inferred from `client` if omitted. */
  initStatus?: InitStatus;

  /** The error from `waitForInitialization()`, if any. */
  initError?: unknown;

  /** Fires when the init status transitions (e.g. failed → initialized). */
  onStatusChange?: OnStatusChange;

  /** Fires when the SDK emits a runtime error. */
  onError?: OnError;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    __LD__?: Context<any>;
  }
}

function setPersistedFlags<ELDFlagSet extends LDFlagSet>(
  context: Context<ELDFlagSet>,
) {
  const persistedFlags = window.localStorage.getItem(STORAGE_KEY);

  if (persistedFlags) {
    context.replaceFlags(JSON.parse(persistedFlags) as ELDFlagSet);
  }
}

function setCurrentContext<ELDFlagSet extends LDFlagSet>(
  context: Context<ELDFlagSet>,
) {
  setPersistedFlags(context);
  window.__LD__ = context;
}

function getCurrentContext<
  Flags extends LDFlagSet = LDFlagSet,
>(): Context<Flags> | null {
  return (window.__LD__ as Context<Flags>) ?? null;
}

function removeCurrentContext() {
  delete window.__LD__;
}

class Context<ELDFlagSet extends LDFlagSet> {
  @tracked initStatus: InitStatus;
  @tracked initError?: unknown;
  @tracked lastError?: Error;

  #flags = new TrackedMap<keyof ELDFlagSet, ELDFlagSet[keyof ELDFlagSet]>();
  #client?: LDClient | null = null;
  #onStatusChange?: OnStatusChange;
  #onError?: OnError;

  constructor(options: ContextOptions<ELDFlagSet> = {}) {
    const { flags, client, initStatus, initError, onStatusChange, onError } =
      options;

    this.initStatus = initStatus ?? (client ? 'initialized' : 'local');
    this.initError = initError;

    this.#client = client;
    this.#onStatusChange = onStatusChange;
    this.#onError = onError;

    this.updateFlags(flags ?? ({} as ELDFlagSet));
  }

  updateFlags(flags: ELDFlagSet) {
    for (const [key, value] of Object.entries(flags) as [
      keyof ELDFlagSet,
      ELDFlagSet[keyof ELDFlagSet],
    ][]) {
      this.#flags.set(key, value);
    }
  }

  replaceFlags(flags: ELDFlagSet) {
    this.#flags.clear();
    this.updateFlags(flags);
  }

  enable(key: keyof ELDFlagSet) {
    this.#flags.set(key, true as ELDFlagSet[keyof ELDFlagSet]);
  }

  disable(key: keyof ELDFlagSet) {
    this.#flags.set(key, false as ELDFlagSet[keyof ELDFlagSet]);
  }

  set(key: keyof ELDFlagSet, value: LDFlagValue) {
    this.#flags.set(key, value as ELDFlagSet[keyof ELDFlagSet]);
  }

  get<T>(key: keyof ELDFlagSet, defaultValue?: T | null): T {
    if (!this.#flags.has(key) && defaultValue != null) {
      return defaultValue;
    }

    return this.#flags.get(key) as T;
  }

  persist() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.allFlags));
  }

  resetPersistence() {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  get allFlags() {
    const allFlags: LDFlagSet = {};

    for (const [key, value] of this.#flags.entries()) {
      allFlags[key as string] = value;
    }

    return allFlags;
  }

  get isLocal() {
    return !this.client;
  }

  /**
   * Whether initialization completed successfully (status is `'initialized'` or `'local'`).
   */
  get initSucceeded(): boolean {
    return this.initStatus === 'initialized' || this.initStatus === 'local';
  }

  /**
   * Transition the init status. Fires `onStatusChange` if the status actually changed.
   * @internal
   */
  transitionStatus(newStatus: InitStatus, error?: unknown) {
    const previous = this.initStatus;

    if (previous === newStatus) {
      return;
    }

    this.initStatus = newStatus;
    this.initError = error;
    this.#onStatusChange?.(newStatus, previous);
  }

  /**
   * Record a runtime error from the SDK's `'error'` event.
   * @internal
   */
  handleError(error: Error) {
    this.lastError = error;

    if (this.#onError) {
      this.#onError(error);
    } else {
      warn(`LaunchDarkly SDK error: ${String(error)}`, false, {
        id: 'ember-launch-darkly.sdk-error',
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Thin SDK passthroughs
  //
  // These delegate directly to the underlying LDClient. The addon's value-add
  // is the reactive flag layer above — these methods are here so consumers
  // don't need to reach into `context.client` for common operations.
  // ---------------------------------------------------------------------------

  /**
   * Like `variation()`, but includes the evaluation reason.
   *
   * Requires `evaluationReasons: true` in the initialization options.
   *
   * @see https://docs.launchdarkly.com/sdk/features/evaluation-reasons
   */
  variationDetail(key: string, defaultValue?: LDFlagValue): LDEvaluationDetail {
    if (!this.#client) {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      return {
        value: this.get<LDFlagValue>(key, defaultValue),
        variationIndex: undefined,
        reason: undefined,
      };
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    }

    return this.#client.variationDetail(key, defaultValue);
  }

  /**
   * Send a custom event to LaunchDarkly for Experimentation metrics.
   *
   * No-op in local mode.
   *
   * @see https://docs.launchdarkly.com/sdk/features/events
   */
  track(key: string, data?: unknown, metricValue?: number) {
    this.#client?.track(key, data, metricValue);
  }

  /**
   * Flush pending analytics events to LaunchDarkly without closing the client.
   *
   * Useful before a page navigation in an SPA to ensure events are delivered.
   *
   * No-op in local mode.
   *
   * @see https://docs.launchdarkly.com/sdk/features/flush
   */
  async flush(): Promise<void> {
    await this.#client?.flush();
  }

  /**
   * Shut down the LD client, release resources, and flush pending events.
   *
   * When `force` is `true`, the client is closed without waiting for the
   * pending event flush to complete. This is useful when the LD endpoint
   * is unresponsive and `await close()` would hang.
   *
   * After calling this, the context should not be used. Typically called
   * during application teardown or in test cleanup.
   */
  async close({ force = false }: { force?: boolean } = {}): Promise<void> {
    if (!this.#client) {
      return;
    }

    if (force) {
      // Fire-and-forget — don't await the flush that close() triggers.
      void this.#client.close();
    } else {
      await this.#client.close();
    }
  }

  /**
   * Shut down the LD client and remove this context from the global state,
   * allowing `initialize()` to be called again.
   *
   * This is the recommended way to handle a failed initialization when you
   * want to fall back to local mode:
   *
   * ```ts
   * const result = await initialize(clientSideId, user, options);
   * if (!result.isOk) {
   *   await result.context.destroy();
   *   await initialize(clientSideId, user, { mode: 'local', localFlags: DEFAULTS });
   * }
   * ```
   *
   * Pass `{ force: true }` when the endpoint is unresponsive to avoid
   * hanging on the pending flush.
   */
  async destroy({ force = false }: { force?: boolean } = {}): Promise<void> {
    await this.close({ force });

    // Only remove if we're still the active context — another context may
    // have been set while close() was awaiting.
    if (getCurrentContext() === this) {
      removeCurrentContext();
    }
  }

  get persisted(): ELDFlagSet | undefined {
    const persisted = window.localStorage.getItem(STORAGE_KEY);
    return persisted ? (JSON.parse(persisted) as ELDFlagSet) : undefined;
  }

  get client(): LDClient | null | undefined {
    return this.#client;
  }

  get user() {
    if (this.isLocal) {
      return { key: 'local-mode-no-user-specified' };
    }

    if (this.client) {
      return this.client.getContext();
    }

    return { key: 'unknown-user' };
  }
}

export {
  getCurrentContext,
  removeCurrentContext,
  setCurrentContext,
  setPersistedFlags,
  Context as default,
};
