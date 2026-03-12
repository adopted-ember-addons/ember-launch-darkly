import { getCurrentContext } from './context.js';

/**
 * Result returned by `identify()`.
 */

async function identify(user, hash) {
  const context = getCurrentContext();
  if (!context) {
    return {
      isOk: false,
      error: new Error('LaunchDarkly has not been initialized. Call `initialize()` before `identify()`.')
    };
  }
  if (context.isLocal) {
    return {
      isOk: true
    };
  }
  try {
    const flags = await context.client?.identify(user, hash);
    context.replaceFlags(flags);
    return {
      isOk: true
    };
  } catch (error) {
    return {
      isOk: false,
      error
    };
  }
}

export { identify };
//# sourceMappingURL=identify.js.map
