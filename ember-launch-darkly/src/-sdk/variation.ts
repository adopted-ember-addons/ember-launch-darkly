import { getCurrentContext } from './context.ts';

export function variation<ELDFlagDefaultValue>(
  key: string,
  defaultValue: ELDFlagDefaultValue | null = null,
) {
  const context = getCurrentContext();

  if (!context.isLocal) {
    context.client?.variation(key);
  }

  return context.get(key, defaultValue);
}
