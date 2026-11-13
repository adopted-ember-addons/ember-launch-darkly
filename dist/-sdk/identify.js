import { getCurrentContext } from './context.js';
import { stopAwaitingFirstPayload } from './initialize.js';

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
  stopAwaitingFirstPayload(context);
  try {
    const flags = await context.client?.identify(user, hash);
    context.replaceFlags(flags);

    // The SDK only emits 'change' when flags differ, so don't rely on it to
    // leave a failed init behind.
    if (context.initStatus === 'failed') {
      context.transitionStatus('initialized');
    }
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
