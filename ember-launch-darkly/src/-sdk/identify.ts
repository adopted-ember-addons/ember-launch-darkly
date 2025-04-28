import { getCurrentContext } from './context.ts';

export async function identify(user: any, hash = null) {
  let context = getCurrentContext();

  if (!context.isLocal) {
    let flags = await context.client.identify(user, hash);

    context.replaceFlags(flags);
  }
}
