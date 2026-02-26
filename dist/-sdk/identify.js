
import { getCurrentContext } from './context.js';

async function identify(user, hash) {
  const context = getCurrentContext();
  if (!context) {
    throw new Error('LaunchDarkly has not been initialized. Call `initialize()` before `identify()`.');
  }
  if (!context.isLocal) {
    const flags = await context.client?.identify(user, hash);
    context.replaceFlags(flags);
  }
}

export { identify };
//# sourceMappingURL=identify.js.map
