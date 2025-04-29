import type { setupTest } from 'ember-qunit';
type NestedHooks = Parameters<typeof setupTest>[0];
export default function setupLaunchDarkly(hooks: NestedHooks): void;
export {};
