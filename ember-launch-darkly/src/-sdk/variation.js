import { getCurrentContext } from './context';

export function variation(key, defaultValue = null) {
  let context;
 
  try {
    context = getCurrentContext();
  } catch (e) {
    // we're not initialized for some reason, just return the default val
    return defaultValue;
  }

  if (!context.isLocal) {
    context.client.variation(key);
  }

  return context.get(key, defaultValue);
}
