# Upgrading to v6.x

This documents the breaking changes introduced in ember-launch-darkly v6.

## `initialize()` now accepts a single options object

The `initialize` function signature has changed from three positional arguments to a single options object.

**Before (v5):**

```js
import { initialize } from 'ember-launch-darkly';

await initialize(clientSideId, user, {
  mode: 'remote',
  streamingFlags: { 'my-flag': true },
  localFlags: { 'my-flag': false },
  bootstrap: 'localFlags',
});
```

**After (v6):**

```js
import { initialize } from 'ember-launch-darkly';

await initialize({
  clientSideId: 'your-client-side-id',
  user: { key: 'aa0ceb' },
  mode: 'remote',
  streamingFlags: { 'my-flag': true },
  localFlags: { 'my-flag': false },
  bootstrap: 'localFlags',
});
```

LaunchDarkly SDK options that were previously mixed into the options object should now be passed under `ldOptions`:

```js
await initialize({
  clientSideId: 'your-client-side-id',
  user: { key: 'aa0ceb' },
  mode: 'remote',
  ldOptions: {
    // any LDClient.LDOptions go here
  },
});
```

## `variation` helper now uses positional arguments only

The `variation` template helper no longer accepts named arguments. Use positional arguments for the flag key and default value.

**Before (v5):**

```hbs
{{variation "my-flag" default="fallback"}}
```

**After (v6):**

```gjs
import { variation } from 'ember-launch-darkly';

<template>
  {{variation "my-flag" "fallback"}}
</template>
```

The JavaScript API is unchanged:

```js
import { variation } from 'ember-launch-darkly';

variation('my-flag', 'fallback');
```

## V2 addon format (Vite-based)

ember-launch-darkly is now a V2 addon. This means:

- It no longer uses `config/environment.js` for configuration. Call `initialize()` directly in your application route.
- The addon is compatible with Embroider and Vite-based Ember apps.
- Minimum supported Ember version may have changed — check `peerDependencies` in `package.json`.

## `setupLaunchDarkly` no longer reads from `config:environment`

The test helper no longer looks up `config:environment` to discover flag keys. Instead, pass flag keys directly as the second argument.

**Before (v5):**

```js
// relied on config/environment.js having launchDarkly.localFlags
setupLaunchDarkly(hooks);
```

**After (v6):**

```js
// As an array — all flags default to false
setupLaunchDarkly(hooks, { flags: ['my-flag', 'other-flag'] });

// As an object — flags are initialized with the provided values
setupLaunchDarkly(hooks, {
  flags: { 'my-flag': true, 'shape': 'square' },
});
```

If you don't need flags pre-initialized, you can still call `setupLaunchDarkly(hooks)` with no options — `this.withVariation(key, value)` will set them dynamically.
