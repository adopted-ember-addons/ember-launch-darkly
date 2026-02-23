import { warn } from '@ember/debug';

import { getCurrentContext } from './context.ts';

/**
 * Evaluate a LaunchDarkly feature flag and return its current value.
 *
 * In **remote** mode, this also notifies the LaunchDarkly client that the flag
 * was evaluated so analytics events are tracked correctly.
 *
 * In **local** mode, the value is read directly from the local flag set
 * configured during {@link initialize}.
 *
 * This function is reactive — when used in a template or within a tracked
 * computation, it will automatically re-render when the flag value changes
 * (e.g. via streaming updates or {@link identify}).
 *
 * @param key - The feature flag key as defined in LaunchDarkly.
 * @param defaultValue - An optional fallback value returned when the flag is
 *   not found in the current context. Defaults to `null`.
 * @returns The current value of the feature flag, or `defaultValue` if the
 *   flag is not set.
 *
 * @example
 * ```ts
 * import { variation } from 'ember-launch-darkly';
 *
 * // Boolean flag
 * if (variation('new-dashboard')) {
 *   showNewDashboard();
 * }
 *
 * // Multivariate flag with a default
 * const theme = variation('app-theme', 'light');
 * ```
 */
export function variation<ELDFlagDefaultValue>(
  key: string,
  defaultValue: ELDFlagDefaultValue | null = null,
) {
  const context = getCurrentContext();

  if (!context) {
    warn(
      `LaunchDarkly has not been initialized. Returning default value for "${key}".`,
      false,
      { id: 'ember-launch-darkly.variation.not-initialized' },
    );

    return defaultValue;
  }

  if (!context.isLocal) {
    context.client?.variation(key);
  }

  return context.get(key, defaultValue);
}
