import { warn } from '@ember/debug';

import { getCurrentContext } from './context.ts';

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
