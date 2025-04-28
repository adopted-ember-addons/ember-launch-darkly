import { getCurrentContext } from './context.ts';

export async function identify(user: any, hash = null) {
  const context = getCurrentContext();

  if (!context.isLocal) {
    const flags = await context.client.identify(user, hash);

    context.replaceFlags(flags);
  }
}
