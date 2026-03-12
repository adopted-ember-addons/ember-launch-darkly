import { settled } from '@ember/test-helpers';
import Context, { setCurrentContext, getCurrentContext } from '../-sdk/context.js';

function setupLaunchDarkly(hooks) {
  hooks.beforeEach(function () {
    if (!this.owner) {
      throw new Error('You must call one of the ember-qunit setupTest(), setupRenderingTest() or setupApplicationTest() methods before calling setupLaunchDarkly()');
    }
    const owner = this.owner;
    const config = owner.resolveRegistration('config:environment');
    let {
      localFlags
    } = {
      localFlags: {},
      ...(config?.launchDarkly || {})
    };
    localFlags = Object.keys(localFlags).reduce((acc, key) => {
      // @ts-expect-error TODO: fix this type error
      acc[key] = false;
      return acc;
    }, {});
    const context = new Context({
      flags: localFlags
    });
    setCurrentContext(context);
    this.withVariation = (key, value = true) => {
      const context = getCurrentContext();
      if (!context) {
        throw new Error('LaunchDarkly context is missing. Ensure `setupLaunchDarkly` has initialized correctly.');
      }
      context.set(key, value);
      return settled();
    };

    /**
     * Simulate a specific initialization status in tests.
     *
     * Useful for testing degraded-state UI when LaunchDarkly fails to
     * initialize.
     *
     * @example
     * ```js
     * await this.withInitStatus('failed', new Error('timeout'));
     * // Now context.initStatus === 'failed' and context.initError is the Error
     * ```
     */
    this.withInitStatus = (status, error) => {
      const context = getCurrentContext();
      if (!context) {
        throw new Error('LaunchDarkly context is missing. Ensure `setupLaunchDarkly` has initialized correctly.');
      }
      context.transitionStatus(status, error);
      return settled();
    };
  });
  hooks.afterEach(async function () {
    const context = getCurrentContext();
    await context?.destroy();
    await settled();
    delete this.withVariation;
    delete this.withInitStatus;
  });
}

export { setupLaunchDarkly as default };
//# sourceMappingURL=setup-launch-darkly.js.map
