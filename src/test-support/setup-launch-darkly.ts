import { settled } from '@ember/test-helpers';
import {
  default as Context,
  getCurrentContext,
  setCurrentContext,
  removeCurrentContext,
} from '../-sdk/context.ts';

import type { TestContext } from '@ember/test-helpers';
import type { setupTest } from 'ember-qunit';

type NestedHooks = Parameters<typeof setupTest>[0];
export interface LDTestContext extends TestContext {
  withVariation?: (key: string, value?: unknown) => Promise<void>;
}

export interface SetupLaunchDarklyOptions {
  /**
   * Flags to initialize in the test context.
   *
   * - As an array of strings: all flags default to `false`.
   * - As an object: flags are initialized with the provided values.
   */
  flags?: string[] | Record<string, unknown>;
}

/**
 * Sets up LaunchDarkly for testing.
 *
 * Initializes a local context with the provided flags.
 * Use `this.withVariation(key, value)` in tests to override flag values.
 *
 * @param hooks - The test hooks from `setupTest()`, `setupRenderingTest()`, etc.
 * @param options - Configuration options.
 *
 * @example
 * ```js
 * // With flag keys (all default to false)
 * setupLaunchDarkly(hooks, { flags: ['my-flag', 'other-flag'] });
 *
 * // With flag key-value pairs
 * setupLaunchDarkly(hooks, {
 *   flags: { 'my-flag': true, 'shape': 'square' },
 * });
 * ```
 */
export default function setupLaunchDarkly(
  hooks: NestedHooks,
  options: SetupLaunchDarklyOptions = {},
) {
  const { flags = [] } = options;

  hooks.beforeEach(function (this: LDTestContext) {
    if (!this.owner) {
      throw new Error(
        'You must call one of the ember-qunit setupTest(), setupRenderingTest() or setupApplicationTest() methods before calling setupLaunchDarkly()',
      );
    }

    let localFlags: Record<string, unknown>;

    if (Array.isArray(flags)) {
      localFlags = {};

      for (const key of flags) {
        localFlags[key] = false;
      }
    } else {
      localFlags = { ...flags };
    }

    const context = new Context(localFlags);

    setCurrentContext(context);

    this.withVariation = (key, value = true) => {
      const context = getCurrentContext();

      if (!context) {
        throw new Error(
          'LaunchDarkly context is missing. Ensure `setupLaunchDarkly` has initialized correctly.',
        );
      }

      context.set(key, value);

      return settled();
    };
  });

  hooks.afterEach(async function (this: LDTestContext) {
    await settled();
    delete this.withVariation;
    removeCurrentContext();
  });
}
