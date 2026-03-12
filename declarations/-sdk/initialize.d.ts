import * as LDClient from 'launchdarkly-js-client-sdk';
import Context from './context.ts';
import type { InitStatus, OnStatusChange, OnError } from './context.ts';
type StreamingConfig = {
    allExcept?: Array<string>;
    [key: string]: unknown;
};
export interface EmberLaunchDarklyOptions extends Omit<LDClient.LDOptions, 'bootstrap'> {
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
export declare function shouldUpdateFlag(key: string, streamingConfig?: StreamingConfig | boolean): boolean;
export declare function initialize(clientSideId: string, user?: {}, options?: EmberLaunchDarklyOptions): Promise<InitializeResult>;
export {};
//# sourceMappingURL=initialize.d.ts.map