import { getCurrentContext } from './context.ts';
import type { LDUser } from 'launchdarkly-js-client-sdk';

export async function identify(user: LDUser, hash?: string): Promise<void> {
  const context = getCurrentContext();

  if (!context) {
    throw new Error(
      'LaunchDarkly has not been initialized. Call `initialize()` before `identify()`.',
    );
  }

  if (!context.isLocal) {
    const flags = await context.client?.identify(user, hash);

    context.replaceFlags(flags as Record<string, unknown>);
  }
}
