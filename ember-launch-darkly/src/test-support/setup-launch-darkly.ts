import type ApplicationInstance from '@ember/application/instance';
import { settled, type TestContext } from '@ember/test-helpers';
import type { setupTest } from 'ember-qunit';

import {
  default as Context,
  getCurrentContext,
  setCurrentContext,
  removeCurrentContext,
} from '../-sdk/context.ts';
import type { EmberLaunchDarklyOptions } from '../-sdk/initialize.ts';

type NestedHooks = Parameters<typeof setupTest>[0];
interface LDTestContext extends TestContext {
  withVariation?: (key: string, value: boolean) => Promise<void>;
}

export default function setupLaunchDarkly(hooks: NestedHooks) {
  hooks.beforeEach(function (this: LDTestContext) {
    if (!this.owner) {
      throw new Error(
        'You must call one of the ember-qunit setupTest(), setupRenderingTest() or setupApplicationTest() methods before calling setupLaunchDarkly()',
      );
    }

    const owner = this.owner as ApplicationInstance;
    const config = owner.resolveRegistration('config:environment') as {
      launchDarkly: EmberLaunchDarklyOptions;
    };
    let { localFlags } = {
      localFlags: {},
      ...(config?.launchDarkly || {}),
    } as { localFlags: Record<string, unknown> };

    localFlags = Object.keys(localFlags).reduce((acc, key) => {
      // @ts-expect-error TODO: fix this type error
      acc[key] = false;

      return acc;
    }, {});

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
