import type { TestContext } from '@ember/test-helpers';
import type { setupTest } from 'ember-qunit';
import type { InitStatus } from '../-sdk/context.ts';
type NestedHooks = Parameters<typeof setupTest>[0];
export interface LDTestContext extends TestContext {
    withVariation?: (key: string, value?: unknown) => Promise<void>;
    withInitStatus?: (status: InitStatus, error?: unknown) => Promise<void>;
}
export default function setupLaunchDarkly(hooks: NestedHooks): void;
export {};
//# sourceMappingURL=setup-launch-darkly.d.ts.map