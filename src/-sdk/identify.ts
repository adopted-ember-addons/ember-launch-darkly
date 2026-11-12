import { getCurrentContext } from './context.ts';
import type { LDUser } from 'launchdarkly-js-client-sdk';

/**
 * Result returned by `identify()`.
 */
export interface IdentifyResult {
  /** Whether the identify call completed successfully. */
  isOk: boolean;

  /** The error if the identify call failed, otherwise `undefined`. */
  error?: unknown;
}

export async function identify(
  user: LDUser,
  hash?: string,
): Promise<IdentifyResult> {
  const context = getCurrentContext();

  if (!context) {
    return {
      isOk: false,
      error: new Error(
        'LaunchDarkly has not been initialized. Call `initialize()` before `identify()`.',
      ),
    };
  }

  if (context.isLocal) {
    return { isOk: true };
  }

  try {
    const flags = await context.client?.identify(user, hash);

    context.replaceFlags(flags as Record<string, unknown>);

    // The SDK only emits 'change' when flags differ, so don't rely on it to
    // leave a failed init behind.
    if (context.initStatus === 'failed') {
      context.transitionStatus('initialized');
    }

    return { isOk: true };
  } catch (error) {
    return { isOk: false, error };
  }
}
