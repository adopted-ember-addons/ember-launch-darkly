import { isNone } from '@ember/utils';
import { TrackedMap } from 'tracked-built-ins';
import window from 'ember-window-mock';
import type {
  LDClient,
  LDFlagSet,
  LDFlagValue,
} from 'launchdarkly-js-client-sdk';

const STORAGE_KEY = 'ember-launch-darkly';

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
>(): Context<Flags> {
  const context = window.__LD__;

  if (!context) {
    throw new Error(
      'Launch Darkly has not been initialized. Ensure that you run the `initialize` function before `variation`.',
    );
  }

  return context as Context<Flags>;
}

function removeCurrentContext() {
  delete window.__LD__;
}

class Context<ELDFlagSet extends LDFlagSet> {
  _flags = new TrackedMap<keyof ELDFlagSet, ELDFlagSet[keyof ELDFlagSet]>();
  _client?: LDClient | null = null;

  constructor(flags?: ELDFlagSet, client?: LDClient) {
    this._client = client;

    this.updateFlags(flags ?? ({} as ELDFlagSet));
  }

  updateFlags(flags: ELDFlagSet) {
    for (const [key, value] of Object.entries(flags) as [
      keyof ELDFlagSet,
      ELDFlagSet[keyof ELDFlagSet],
    ][]) {
      this._flags.set(key, value);
    }
  }

  replaceFlags(flags: ELDFlagSet) {
    this._flags.clear();
    this.updateFlags(flags);
  }

  enable(key: keyof ELDFlagSet) {
    this._flags.set(key, true as ELDFlagSet[keyof ELDFlagSet]);
  }

  disable(key: keyof ELDFlagSet) {
    this._flags.set(key, false as ELDFlagSet[keyof ELDFlagSet]);
  }

  set(key: keyof ELDFlagSet, value: LDFlagValue) {
    this._flags.set(key, value as ELDFlagSet[keyof ELDFlagSet]);
  }

  get<T>(key: keyof ELDFlagSet, defaultValue?: T | null): T {
    const value = this._flags.get(key);

    if (isNone(value)) {
      if (!isNone(defaultValue)) {
        return defaultValue;
      }
      throw new Error(
        `Flag ${String(key)} is missing and no default value was provided.`,
      );
    }

    return value as T;
  }

  persist() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.allFlags));
  }

  resetPersistence() {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  get allFlags() {
    const allFlags: LDFlagSet = {};

    for (const [key, value] of this._flags.entries()) {
      allFlags[key as string] = value;
    }

    return allFlags;
  }

  get isLocal() {
    return isNone(this.client);
  }

  get persisted(): ELDFlagSet | undefined {
    const persisted = window.localStorage.getItem(STORAGE_KEY);
    return persisted ? (JSON.parse(persisted) as ELDFlagSet) : undefined;
  }

  get client(): LDClient | null | undefined {
    return this._client;
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
