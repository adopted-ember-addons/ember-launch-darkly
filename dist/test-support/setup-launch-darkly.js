
import { settled } from '@ember/test-helpers';
import Context, { setCurrentContext, getCurrentContext, removeCurrentContext } from '../-sdk/context.js';

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
    const context = new Context(localFlags);
    setCurrentContext(context);
    this.withVariation = (key, value = true) => {
      const context = getCurrentContext();
      context.set(key, value);
      return settled();
    };
  });
  hooks.afterEach(async function () {
    await settled();
    delete this.withVariation;
    removeCurrentContext();
  });
}

export { setupLaunchDarkly as default };
//# sourceMappingURL=setup-launch-darkly.js.map
