import { getCurrentContext } from './context';

export async function identify(user, hash = null) {
  let context = getCurrentContext();
  if (!context) {
    throw new Error(
      'Launch Darkly has not been initialized. Ensure that you run the `initialize` function before `varitaion`.'
    );
  }

  let flags = await context.client.identify(user, hash);

  context.updateFlags(flags);
}
