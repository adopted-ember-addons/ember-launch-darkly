import { getCurrentContext } from './context.ts';

export function variation<ELDFlagValue>(
  key: string,
  defaultValue: ELDFlagValue | boolean | null = null,
): ELDFlagValue | boolean {
  const context = getCurrentContext();

  if (!context.isLocal) {
    context.client?.variation(key);
  }

  return context.get<ELDFlagValue>(key, defaultValue);
}
