# Upgrading to 6.x

## Overview

v6.0 reshapes `ember-launch-darkly` into a **thin reactive layer** over the
[LaunchDarkly JS Client SDK](https://github.com/launchdarkly/js-client-sdk).
Every SDK capability you need is now reachable through the public API —
no more reaching into private paths.

This guide covers the breaking changes and how to migrate.

## Breaking Changes at a Glance

| Change                              | v5                                          | v6                                               |
| ----------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| **SDK dependency**                  | bundled (`dependencies`)                    | **peer** (`peerDependencies`) — you install it   |
| **Context constructor**             | 6 positional args                           | single options object                            |
| **`initialize()` return**           | `{ isOk, status, error }`                   | `{ isOk, status, error, context }`               |
| **`Context` / `getCurrentContext`** | private (had to import from `-sdk/context`) | **public** (import from `ember-launch-darkly`)   |
| **`throwOnInitializationError`**    | Option that toggled throwing                | **Removed** — use `result.isOk` / `result.error` |

## Step 1: Install the SDK as a peer dependency

v6 no longer bundles `launchdarkly-js-client-sdk`. You must install it
yourself so you control the version and avoid duplicate bundles:

```bash
# npm
npm install launchdarkly-js-client-sdk@^3

# pnpm
pnpm add launchdarkly-js-client-sdk@^3

# yarn
yarn add launchdarkly-js-client-sdk@^3
```

Then upgrade the addon:

```bash
# npm
npm install ember-launch-darkly@^6

# pnpm
pnpm add ember-launch-darkly@^6
```

## Step 2: Update `initialize()` usage

`initialize()` now returns a `context` on the result object. This is the
recommended way to access the LaunchDarkly context — no more private imports.

### Before (v5)

```js
import { initialize } from "ember-launch-darkly";
import { getCurrentContext } from "ember-launch-darkly/-sdk/context"; // private!

export default class ApplicationRoute extends Route {
  async model() {
    await initialize(clientSideId, user, options);

    // had to reach into private path to get the context
    const context = getCurrentContext();
  }
}
```

### After (v6)

```js
import { initialize } from "ember-launch-darkly";

export default class ApplicationRoute extends Route {
  async model() {
    const { isOk, status, error, context } = await initialize(
      clientSideId,
      user,
      options,
    );

    if (!isOk) {
      console.warn("LD init failed:", error);
    }

    // `context` is now part of the public API
    // Store it in a service, pass it around, use it in templates, etc.
    return { context };
  }
}
```

If you still want to access the context from anywhere without threading it
through, `getCurrentContext` is now a public export:

```js
import { getCurrentContext } from "ember-launch-darkly";
```

## Step 3: Replace `throwOnInitializationError`

The `throwOnInitializationError` option has been removed. In v5, it controlled
whether `initialize()` would throw on failure. In v6, `initialize()` **never
throws** — it always returns a result object.

### Before (v5)

```js
try {
  await initialize(clientSideId, user, {
    throwOnInitializationError: true,
  });
} catch (e) {
  // handle failure
}
```

### After (v6)

```js
const { isOk, error, context } = await initialize(clientSideId, user, options);

if (!isOk) {
  // handle failure — context is still usable with default/bootstrap values
  console.error("LaunchDarkly failed:", error);
}
```

## Step 4: Update direct `Context` construction (if applicable)

If you were constructing `Context` directly (typically only in tests), the
constructor now takes a single options object instead of positional arguments.

### Before (v5)

```js
import Context from "ember-launch-darkly/-sdk/context";

// 6 positional args — hard to read, easy to get wrong
const context = new Context(
  flags,
  client,
  "failed",
  error,
  onStatusChange,
  onError,
);

// local mode with flags only
const context = new Context(localFlags);
```

### After (v6)

```js
import { Context } from "ember-launch-darkly";

// Named options — self-documenting, order-independent
const context = new Context({
  flags,
  client,
  initStatus: "failed",
  initError: error,
  onStatusChange,
  onError,
});

// local mode with flags only
const context = new Context({ flags: localFlags });
```

## Step 5: Use the new APIs

v6 adds several capabilities directly on the context object:

### Reactive initialization status

```js
const { context } = await initialize(clientSideId, user, {
  onStatusChange(newStatus, previousStatus) {
    if (newStatus === "initialized" && previousStatus === "failed") {
      console.log("LaunchDarkly recovered!");
    }
  },
});

// These are reactive (@tracked) — templates auto-update
context.initStatus; // 'initialized' | 'failed' | 'local'
context.initSucceeded; // boolean
context.initError; // the error, if any
```

### Runtime error handling

```js
const { context } = await initialize(clientSideId, user, {
  onError(error) {
    Sentry.captureException(error);
  },
});

// Most recent SDK error — reactive
context.lastError; // Error | undefined
```

### SDK passthroughs

```js
// Evaluation reasons (requires evaluationReasons: true in options)
const detail = context.variationDetail("my-flag");
// { value: true, variationIndex: 0, reason: { kind: 'FALLTHROUGH' } }

// Track custom events for Experimentation
context.track("purchase", { item: "shirt" }, 42.0);

// Flush pending events (e.g. before page navigation)
await context.flush();

// Shut down the client
await context.close();

// Force-close without waiting for flush (when endpoint is unresponsive)
await context.close({ force: true });

// Close AND remove from global state, allowing re-initialization
await context.destroy();
await context.destroy({ force: true });
```

### Direct SDK access

The underlying `LDClient` is still available if you need it:

```js
context.client; // the LDClient instance, or null in local mode
```

## Step 6: Update test imports

If your tests import from the private `-sdk/context` path, update them:

### Before (v5)

```js
import Context, {
  setCurrentContext,
  removeCurrentContext,
} from "ember-launch-darkly/-sdk/context";
```

### After (v6)

```js
import { Context } from "ember-launch-darkly";
// setCurrentContext / removeCurrentContext are still available from the
// private path for advanced test scenarios, but setupLaunchDarkly handles
// this automatically.
```

The `setupLaunchDarkly` test helper now automatically calls `context.destroy()`
in `afterEach` and provides a `withInitStatus` helper:

```js
import { setupLaunchDarkly } from "ember-launch-darkly/test-support";

module("Integration | Component | my-component", function (hooks) {
  setupRenderingTest(hooks);
  setupLaunchDarkly(hooks);

  test("shows error banner when LD fails", async function (assert) {
    await this.withInitStatus("failed", new Error("timeout"));
    await render(hbs`<MyComponent />`);
    assert.dom("[data-test-error-banner]").exists();
  });
});
```

## Summary of new public exports

All from `'ember-launch-darkly'`:

| Export                 | Kind     | Description                                                    |
| ---------------------- | -------- | -------------------------------------------------------------- |
| `initialize`           | function | Initialize the LD client, returns `InitializeResult`           |
| `identify`             | function | Switch user context, returns `IdentifyResult`                  |
| `variation`            | function | Read a flag value (reactive)                                   |
| `getCurrentContext`    | function | Get the current `Context` singleton                            |
| `removeCurrentContext` | function | Remove the global context (prefer `context.destroy()` instead) |
| `Context`              | class    | The reactive flag container                                    |
| `InitializeResult`     | type     | Return type of `initialize()` (includes `context`)             |
| `IdentifyResult`       | type     | Return type of `identify()`                                    |
| `ContextOptions`       | type     | Options for `new Context()`                                    |
| `InitStatus`           | type     | `'initialized' \| 'failed' \| 'local'`                         |
| `OnStatusChange`       | type     | Callback for status transitions                                |
| `OnError`              | type     | Callback for runtime errors                                    |

From `'ember-launch-darkly/test-support'`:

| Export              | Kind     | Description                                                                  |
| ------------------- | -------- | ---------------------------------------------------------------------------- |
| `setupLaunchDarkly` | function | Test helper — sets up context, provides `withVariation` and `withInitStatus` |
