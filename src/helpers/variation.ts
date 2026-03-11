import { variation as getVariation } from '../-sdk/variation.ts';

export interface VariationSignature {
  Args: {
    Positional: [key: string];
    Named: { defaultValue?: unknown };
  };
  Return: string | number | boolean | null;
}

export default function variation(
  key: string,
  options?: { defaultValue?: unknown },
): VariationSignature['Return'] {
  return getVariation(
    key,
    options?.defaultValue ?? null,
  ) as VariationSignature['Return'];
}
