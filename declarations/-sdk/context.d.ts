import { TrackedMap } from 'tracked-built-ins';
import type { LDClient, LDFlagSet, LDFlagValue } from 'launchdarkly-js-client-sdk';
declare global {
    interface Window {
        __LD__?: Context<any>;
    }
}
declare function setPersistedFlags<ELDFlagSet extends LDFlagSet>(context: Context<ELDFlagSet>): void;
declare function setCurrentContext<ELDFlagSet extends LDFlagSet>(context: Context<ELDFlagSet>): void;
declare function getCurrentContext<Flags extends LDFlagSet = LDFlagSet>(): Context<Flags>;
declare function removeCurrentContext(): void;
declare class Context<ELDFlagSet extends LDFlagSet> {
    _flags: TrackedMap<keyof ELDFlagSet, ELDFlagSet[keyof ELDFlagSet]>;
    _client?: LDClient | null;
    constructor(flags?: ELDFlagSet, client?: LDClient);
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
    get persisted(): ELDFlagSet | undefined;
    get client(): LDClient | null | undefined;
    get user(): import("launchdarkly-js-sdk-common").LDContext;
}
export { getCurrentContext, removeCurrentContext, setCurrentContext, setPersistedFlags, Context as default, };
