import { getCurrentContext } from './context.ts';

export function variation<ELDFlagValue>(
  key: string,
  defaultValue: ELDFlagValue | null = null,
): ELDFlagValue {
  const context = getCurrentContext();

  if (!context.isLocal) {
    context.client?.variation(key);
  }

  return context.get<ELDFlagValue>(key, defaultValue);
}
