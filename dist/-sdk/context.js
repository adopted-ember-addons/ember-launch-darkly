import { warn } from '@ember/debug';
import { tracked } from '@glimmer/tracking';
import { TrackedMap } from 'tracked-built-ins';
import { g, i } from 'decorator-transforms/runtime-esm';

const STORAGE_KEY = 'ember-launch-darkly';

/**
 * Describes how initialization completed (or recovered).
 *
 * - `'initialized'` — LD SDK initialized successfully, flags are live.
 * - `'failed'`      — LD SDK failed to initialize (timeout, network error, etc.).
 *                      Flags come from bootstrap/allFlags and may be empty.
 * - `'local'`       — Running in local mode with `localFlags`.
 */

/**
 * Callback invoked whenever the {@link InitStatus} of the context changes.
 *
 * This is most useful for reacting to post-init recovery: when the LD SDK
 * reconnects after a failed initialization, the status transitions from
 * `'failed'` to `'initialized'`.
 */

/**
 * Callback invoked whenever the LD SDK emits a runtime error.
 *
 * If you do not provide this callback, errors are logged via `@ember/debug`'s
 * `warn()`. If you do, errors are forwarded to your callback instead.
 */

/**
 * Options for constructing a {@link Context}.
 *
 * All properties are optional — a bare `new Context()` produces a valid
 * local-mode context with no flags.
 */

function setPersistedFlags(context) {
  const persistedFlags = window.localStorage.getItem(STORAGE_KEY);
  if (persistedFlags) {
    context.replaceFlags(JSON.parse(persistedFlags));
  }
}
function setCurrentContext(context) {
  setPersistedFlags(context);
  window.__LD__ = context;
}
function getCurrentContext() {
  return window.__LD__ ?? null;
}
function removeCurrentContext() {
  delete window.__LD__;
}
class Context {
  static {
    g(this.prototype, "initStatus", [tracked]);
  }
  #initStatus = (i(this, "initStatus"), void 0);
  static {
    g(this.prototype, "initError", [tracked]);
  }
  #initError = (i(this, "initError"), void 0);
  static {
    g(this.prototype, "lastError", [tracked]);
  }
  #lastError = (i(this, "lastError"), void 0);
  #flags = new TrackedMap();
  #client = null;
  #onStatusChange;
  #onError;
  constructor(options = {}) {
    const {
      flags,
      client,
      initStatus,
      initError,
      onStatusChange,
      onError
    } = options;
    this.initStatus = initStatus ?? (client ? 'initialized' : 'local');
    this.initError = initError;
    this.#client = client;
    this.#onStatusChange = onStatusChange;
    this.#onError = onError;
    this.updateFlags(flags ?? {});
  }
  updateFlags(flags) {
    for (const [key, value] of Object.entries(flags)) {
      this.#flags.set(key, value);
    }
  }
  replaceFlags(flags) {
    this.#flags.clear();
    this.updateFlags(flags);
  }
  enable(key) {
    this.#flags.set(key, true);
  }
  disable(key) {
    this.#flags.set(key, false);
  }
  set(key, value) {
    this.#flags.set(key, value);
  }
  get(key, defaultValue) {
    if (!this.#flags.has(key) && defaultValue != null) {
      return defaultValue;
    }
    return this.#flags.get(key);
  }
  persist() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.allFlags));
  }
  resetPersistence() {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  get allFlags() {
    const allFlags = {};
    for (const [key, value] of this.#flags.entries()) {
      allFlags[key] = value;
    }
    return allFlags;
  }
  get isLocal() {
    return !this.client;
  }

  /**
   * Whether initialization completed successfully (status is `'initialized'` or `'local'`).
   */
  get initSucceeded() {
    return this.initStatus === 'initialized' || this.initStatus === 'local';
  }

  /**
   * Transition the init status. Fires `onStatusChange` if the status actually changed.
   * @internal
   */
  transitionStatus(newStatus, error) {
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
  handleError(error) {
    this.lastError = error;
    if (this.#onError) {
      this.#onError(error);
    } else {
      warn(`LaunchDarkly SDK error: ${String(error)}`, false, {
        id: 'ember-launch-darkly.sdk-error'
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
  variationDetail(key, defaultValue) {
    if (!this.#client) {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      return {
        value: this.get(key, defaultValue),
        variationIndex: undefined,
        reason: undefined
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
  track(key, data, metricValue) {
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
  async flush() {
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
  async close({
    force = false
  } = {}) {
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
  async destroy({
    force = false
  } = {}) {
    await this.close({
      force
    });

    // Only remove if we're still the active context — another context may
    // have been set while close() was awaiting.
    if (getCurrentContext() === this) {
      removeCurrentContext();
    }
  }
  get persisted() {
    const persisted = window.localStorage.getItem(STORAGE_KEY);
    return persisted ? JSON.parse(persisted) : undefined;
  }
  get client() {
    return this.#client;
  }
  get user() {
    if (this.isLocal) {
      return {
        key: 'local-mode-no-user-specified'
      };
    }
    if (this.client) {
      return this.client.getContext();
    }
    return {
      key: 'unknown-user'
    };
  }
}

export { Context as default, getCurrentContext, removeCurrentContext, setCurrentContext, setPersistedFlags };
//# sourceMappingURL=context.js.map
