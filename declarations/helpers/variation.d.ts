export interface VariationSignature {
    Args: {
        Positional: [key: string];
        Named: {
            defaultValue?: unknown;
        };
    };
    Return: string | number | boolean | null;
}
export default function variation(key: string, options?: {
    defaultValue?: unknown;
}): VariationSignature['Return'];
//# sourceMappingURL=variation.d.ts.map