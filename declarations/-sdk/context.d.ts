import type { LDClient, LDEvaluationDetail, LDFlagSet, LDFlagValue } from 'launchdarkly-js-client-sdk';
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
export type OnStatusChange = (newStatus: InitStatus, previousStatus: InitStatus) => void;
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
        __LD__?: Context<any>;
    }
}
declare function setPersistedFlags<ELDFlagSet extends LDFlagSet>(context: Context<ELDFlagSet>): void;
declare function setCurrentContext<ELDFlagSet extends LDFlagSet>(context: Context<ELDFlagSet>): void;
declare function getCurrentContext<Flags extends LDFlagSet = LDFlagSet>(): Context<Flags> | null;
declare function removeCurrentContext(): void;
declare class Context<ELDFlagSet extends LDFlagSet> {
    #private;
    initStatus: InitStatus;
    initError?: unknown;
    lastError?: Error;
    constructor(options?: ContextOptions<ELDFlagSet>);
    updateFlags(flags: ELDFlagSet): void;
    replaceFlags(flags: ELDFlagSet): void;
    enable(key: keyof ELDFlagSet): void;
    disable(key: keyof ELDFlagSet): void;
    set(key: keyof ELDFlagSet, value: LDFlagValue): void;
    get<T>(key: keyof ELDFlagSet, defaultValue?: T | null): T;
    persist(): void;
    resetPersistence(): void;
    get allFlags(): LDFlagSet;
    get isLocal(): boolean;
    /**
     * Whether initialization completed successfully (status is `'initialized'` or `'local'`).
     */
    get initSucceeded(): boolean;
    /**
     * Transition the init status. Fires `onStatusChange` if the status actually changed.
     * @internal
     */
    transitionStatus(newStatus: InitStatus, error?: unknown): void;
    /**
     * Record a runtime error from the SDK's `'error'` event.
     * @internal
     */
    handleError(error: Error): void;
    /**
     * Like `variation()`, but includes the evaluation reason.
     *
     * Requires `evaluationReasons: true` in the initialization options.
     *
     * @see https://docs.launchdarkly.com/sdk/features/evaluation-reasons
     */
    variationDetail(key: string, defaultValue?: LDFlagValue): LDEvaluationDetail;
    /**
     * Send a custom event to LaunchDarkly for Experimentation metrics.
     *
     * No-op in local mode.
     *
     * @see https://docs.launchdarkly.com/sdk/features/events
     */
    track(key: string, data?: unknown, metricValue?: number): void;
    /**
     * Flush pending analytics events to LaunchDarkly without closing the client.
     *
     * Useful before a page navigation in an SPA to ensure events are delivered.
     *
     * No-op in local mode.
     *
     * @see https://docs.launchdarkly.com/sdk/features/flush
     */
    flush(): Promise<void>;
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
    close({ force }?: {
        force?: boolean;
    }): Promise<void>;
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
    destroy({ force }?: {
        force?: boolean;
    }): Promise<void>;
    get persisted(): ELDFlagSet | undefined;
    get client(): LDClient | null | undefined;
    get user(): import("launchdarkly-js-sdk-common").LDContext;
}
export { getCurrentContext, removeCurrentContext, setCurrentContext, setPersistedFlags, Context as default, };
//# sourceMappingURL=context.d.ts.map