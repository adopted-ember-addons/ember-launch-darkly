
import { getCurrentContext } from './context.js';

async function identify(user, hash) {
  const context = getCurrentContext();
  if (!context.isLocal) {
    const flags = await context.client?.identify(user, hash);
    context.replaceFlags(flags);
  }
}

export { identify };
//# sourceMappingURL=identify.js.map
