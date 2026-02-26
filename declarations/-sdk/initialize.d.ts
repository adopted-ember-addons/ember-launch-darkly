import * as LDClient from 'launchdarkly-js-client-sdk';
type StreamingConfig = {
    allExcept?: Array<string>;
    [key: string]: unknown;
};
export interface EmberLaunchDarklyOptions extends Omit<LDClient.LDOptions, 'bootstrap'> {
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
export declare function shouldUpdateFlag(key: string, streamingConfig?: StreamingConfig | boolean): boolean;
export declare function initialize(clientSideId: string, user?: {}, options?: EmberLaunchDarklyOptions): Promise<void>;
export {};
