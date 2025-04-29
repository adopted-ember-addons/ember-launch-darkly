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
}
export declare function shouldUpdateFlag(key: string, streamingConfig?: StreamingConfig | boolean): boolean;
export declare function initialize(clientSideId: string, user?: {}, options?: EmberLaunchDarklyOptions): Promise<void>;
export {};
