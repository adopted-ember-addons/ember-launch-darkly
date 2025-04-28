import { getCurrentContext } from './context.ts';

export function variation(
  key: string,
  defaultValue: boolean | null = null,
): unknown {
  const context = getCurrentContext();

  if (!context.isLocal) {
    context.client?.variation(key);
  }

  return context.get(key, defaultValue);
}
