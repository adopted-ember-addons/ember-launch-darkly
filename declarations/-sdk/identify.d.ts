import type { LDUser } from 'launchdarkly-js-client-sdk';
/**
 * Result returned by `identify()`.
 */
export interface IdentifyResult {
    /** Whether the identify call completed successfully. */
    isOk: boolean;
    /** The error if the identify call failed, otherwise `undefined`. */
    error?: unknown;
}
export declare function identify(user: LDUser, hash?: string): Promise<IdentifyResult>;
//# sourceMappingURL=identify.d.ts.map