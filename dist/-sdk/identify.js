
import { getCurrentContext } from './context.js';

async function identify(user, hash = null) {
  let context = getCurrentContext();
  if (!context.isLocal) {
    let flags = await context.client.identify(user, hash);
    context.replaceFlags(flags);
  }
}

export { identify };
//# sourceMappingURL=identify.js.map
