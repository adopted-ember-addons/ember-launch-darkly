import { getCurrentContext } from './context';

export function variation(key) {
  let context = getCurrentContext();
  if (!context) {
    throw new Error(
      'Launch Darkly has not been initialized. Ensure that you run the `initialize` function before `varitaion`.'
    );
  }

  if (!context.isLocal) {
    context.client.variation(key);
  }

  return context.get(key);
}
