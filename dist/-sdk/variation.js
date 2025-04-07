
import { getCurrentContext } from './context.js';

function variation(key, defaultValue = null) {
  let context = getCurrentContext();
  if (!context.isLocal) {
    context.client.variation(key);
  }
  return context.get(key, defaultValue);
}

export { variation };
//# sourceMappingURL=variation.js.map
