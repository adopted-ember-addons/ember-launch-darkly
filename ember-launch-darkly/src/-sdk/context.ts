import { isNone } from '@ember/utils';
import { TrackedMap } from 'tracked-built-ins';
import window from 'ember-window-mock';

const STORAGE_KEY = 'ember-launch-darkly';

declare global {
  interface Window {
    __LD__?: Context;
  }
}

function setPersistedFlags(context: Context) {
  const persistedFlags = window.localStorage.getItem(STORAGE_KEY);

  if (persistedFlags) {
    context.replaceFlags(JSON.parse(persistedFlags));
  }
}

function setCurrentContext(context: Context) {
  setPersistedFlags(context);
  window.__LD__ = context;
}

function getCurrentContext() {
  const context = window.__LD__;

  if (!context) {
    throw new Error(
      'Launch Darkly has not been initialized. Ensure that you run the `initialize` function before `variation`.',
    );
  }

  return context;
}

function removeCurrentContext() {
  delete window.__LD__;
}

class Context {
  _flags = new TrackedMap();
  _client: any = null;

  constructor(flags = {}, client?: any) {
    this._client = client;

    this.updateFlags(flags);
  }

  updateFlags(flags: object) {
    for (const [key, value] of Object.entries(flags)) {
      this._flags.set(key, value);
    }
  }

  replaceFlags(flags: object) {
    this._flags.clear();
    this.updateFlags(flags);
  }

  enable(key: string) {
    this._flags.set(key, true);
  }

  disable(key: string) {
    this._flags.set(key, false);
  }

  set(key: string, value: boolean) {
    this._flags.set(key, value);
  }

  get(key: string, defaultValue?: boolean | null) {
    if (!this._flags.has(key) && !isNone(defaultValue)) {
      return defaultValue;
    }

    return this._flags.get(key);
  }

  persist() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.allFlags));
  }

  resetPersistence() {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  get allFlags() {
    const allFlags: Record<string, unknown> = {};

    for (const [key, value] of this._flags.entries()) {
      allFlags[key as keyof object] = value;
    }

    return allFlags;
  }

  get isLocal() {
    return isNone(this.client);
  }

  get persisted() {
    const persisted = window.localStorage.getItem(STORAGE_KEY);
    return persisted ? JSON.parse(persisted) : undefined;
  }

  get client() {
    return this._client;
  }

  get user() {
    if (this.isLocal) {
      return { key: 'local-mode-no-user-specified' };
    }

    return this.client?.getContext();
  }
}

export {
  getCurrentContext,
  removeCurrentContext,
  setCurrentContext,
  setPersistedFlags,
  Context as default,
};
