# Ember Launch Darkly

[![CI](https://github.com/adopted-ember-addons/ember-launch-darkly/actions/workflows/ci.yml/badge.svg)](https://github.com/adopted-ember-addons/ember-launch-darkly/actions/workflows/ci.yml)

A thin reactive layer over the [LaunchDarkly JS Client SDK](https://github.com/launchdarkly/js-client-sdk) for Ember.js applications.

**What it gives you:**

- **Reactive flags** — powered by Glimmer's `TrackedMap`, flag changes automatically re-render templates and recompute getters.
- **`{{variation}}` helper** — read flags directly in templates.
- **Test helpers** — `setupLaunchDarkly`, `withVariation`, and `withInitStatus` for deterministic tests.
- **Structured results** — `initialize()` and `identify()` return result objects instead of throwing.

**What it does _not_ do:**

- Hide the SDK — the full `LDClient` is accessible via `context.client` whenever you need it.
- Re-implement SDK features — `track()`, `variationDetail()`, `flush()`, `close()` are thin passthrough.
- Bundle the SDK — `launchdarkly-js-client-sdk` is a peer dependency. You control the version.

## Compatibility

| Addon version | Ember version     |                                                                                             |
| ------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| v6.0          | >= v4.12          | [README](README.md)                                                                         |
| v5.0          | >= v4.12          | [UPGRADING](UPGRADING_TO_v6.x.md)                                                           |
| v4.0          | >= v4.12          | [README](README.md)                                                                         |
| v3.0          | >= v3.28 and v4.4 | [README](README.md)                                                                         |
| v2.0          | >= v3.17          | [README](README.md)                                                                         |
| <= v1.0       | <= v3.16          | [README](https://github.com/adopted-ember-addons/ember-launch-darkly/blob/v1.0.0/README.md) |

## Table of Contents

- [Ember Launch Darkly](#ember-launch-darkly)
  - [Compatibility](#compatibility)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Configuration](#configuration)
    - [Configuration options](#configuration-options)
      - [A note on `sendEventsOnlyForVariation`](#a-note-on-sendeventsonlyforvariation)
  - [Usage](#usage)
    - [Initialize](#initialize)
    - [Identify](#identify)
    - [variation (template helper)](#variation-template-helper)
    - [variation (javascript helper)](#variation-javascript-helper)
    - [Strict mode templates (.gts/.gjs)](#strict-mode-templates-gtsgjs)
    - [Reactive initialization status](#reactive-initialization-status)
    - [Error handling](#error-handling)
    - [SDK passthroughs](#sdk-passthroughs)
  - [Local feature flags](#local-feature-flags)
  - [Streaming feature flags](#streaming-feature-flags)
  - [Content Security Policy](#content-security-policy)
  - [Test helpers](#test-helpers)
    - [Acceptance tests](#acceptance-tests)
    - [Integration tests](#integration-tests)
    - [Testing initialization failures](#testing-initialization-failures)
  - [Using the SDK directly (without this addon)](#using-the-sdk-directly-without-this-addon)
  - [Upgrading](#upgrading)

## Installation

```bash
# Install the addon and the SDK peer dependency
ember install ember-launch-darkly
npm install launchdarkly-js-client-sdk@^3
```

Or with pnpm:

```bash
pnpm add ember-launch-darkly launchdarkly-js-client-sdk@^3
```

## Configuration

Configure from `config/environment.js`:

```js
module.exports = function (environment) {
  let ENV = {
    launchDarkly: {
      clientSideId: "your-client-side-id", // required for remote mode
      mode: environment === "production" ? "remote" : "local",
      localFlags: {
        "new-pricing-plan": false,
        "apply-discount": false,
      },
    },
  };

  return ENV;
};
```

### Configuration options

| Option                       | Default   | Description                                                                                                                                                       |
| ---------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clientSideId`               | —         | Your [LaunchDarkly client-side ID](https://app.launchdarkly.com/settings#/projects). Required for `remote` mode.                                                  |
| `mode`                       | `'local'` | `'local'` or `'remote'`. Local mode uses `localFlags` instead of the LD service.                                                                                  |
| `localFlags`                 | `{}`      | Initial flag values for local mode (also used as `bootstrap` values when `bootstrap: 'localFlags'`).                                                              |
| `timeout`                    | `5`       | Seconds to wait for `waitForInitialization()` before treating init as failed.                                                                                     |
| `streamingFlags`             | `false`   | Subscribe to real-time flag updates. [See streaming section.](#streaming-feature-flags)                                                                           |
| `bootstrap`                  | —         | [Bootstrap configuration](https://docs.launchdarkly.com/sdk/client-side/javascript#bootstrapping). Set to `'localFlags'` to use `localFlags` as bootstrap values. |
| `onStatusChange`             | —         | `(newStatus, previousStatus) => void` callback for status transitions.                                                                                            |
| `onError`                    | —         | `(error) => void` callback for runtime SDK errors.                                                                                                                |
| `sendEventsOnlyForVariation` | `true`    | [See note below.](#a-note-on-sendeventsonlyforvariation)                                                                                                          |
| _Other_                      | —         | Any other [LDOptions](https://docs.launchdarkly.com/sdk/client-side/javascript#customizing-your-client) are passed through to the SDK.                            |

#### A note on `sendEventsOnlyForVariation`

When `false`, events are sent for every feature flag when `client.allFlags()` is called. This can be misleading — a flag may appear as "requested" in the LD dashboard even though your code doesn't use it. We default this to `true` to avoid that. You can set it to `false` if you want those events.

## Usage

### Initialize

Initialize LaunchDarkly early in your app's lifecycle — typically in the application route:

```js
// app/routes/application.js
import Route from "@ember/routing/route";
import { initialize } from "ember-launch-darkly";
import config from "my-app/config/environment";

export default class ApplicationRoute extends Route {
  async beforeModel() {
    let { clientSideId, ...options } = config.launchDarkly;

    let user = { key: "aa0ceb", anonymous: true };

    const { isOk, error, context } = await initialize(
      clientSideId,
      user,
      options,
    );

    if (!isOk) {
      console.warn("LaunchDarkly failed to initialize:", error);

      // Option A: Continue with default/bootstrap flag values.
      // context is still usable — flags will update if the SDK recovers.

      // Option B: Tear down and fall back to local mode.
      await context.destroy({ force: true });
      await initialize(clientSideId, user, {
        mode: "local",
        localFlags: DEFAULT_FLAGS,
      });
    }
  }
}
```

`initialize()` **never throws**. It returns an `InitializeResult`:

```ts
interface InitializeResult {
  isOk: boolean; // true for success or local mode
  status: "initialized" | "failed" | "local";
  error?: unknown; // the error, if failed
  context: Context; // the reactive flag context
}
```

### Identify

Switch the user context after initialization (e.g. after login):

```js
import { identify } from "ember-launch-darkly";

const { isOk, error } = await identify({
  key: session.user.id,
  firstName: session.user.firstName,
  email: session.user.email,
});

if (!isOk) {
  console.error("identify failed:", error);
}
```

### variation (template helper)

```hbs
{{#if (variation "new-login-screen")}}
  <NewLoginScreen />
{{else}}
  <OldLoginScreen />
{{/if}}
```

Multivariate flags:

```hbs
{{#let (variation "pricing-plan") as |plan|}}
  {{#if (eq plan "plan-a")}}
    <PricingPlanA />
  {{else if (eq plan "plan-b")}}
    <PricingPlanB />
  {{/if}}
{{/let}}
```

### variation (javascript helper)

```js
import Component from "@glimmer/component";
import { variation } from "ember-launch-darkly";

export default class PriceDisplay extends Component {
  get price() {
    if (variation("new-pricing-plan")) {
      return 99.0;
    }
    return 199.0;
  }
}
```

### Strict mode templates (.gts/.gjs)

For strict mode templates, import the helper explicitly:

```ts
import { variation } from "ember-launch-darkly/helpers";

<template>
  {{#if (variation "show-banner" defaultValue=false)}}
    <Banner />
  {{/if}}
</template>
```

Or use the SDK function directly (positional args only, no `defaultValue=`):

```ts
import { variation } from "ember-launch-darkly";

<template>
  {{variation "flag-key"}}
</template>
```

Flag values are **reactive** (`TrackedMap`-backed). When a flag changes, code that reads it re-renders automatically.

### Reactive initialization status

The context exposes reactive properties for initialization state:

```js
const { context } = await initialize(clientSideId, user, options);

context.initStatus; // 'initialized' | 'failed' | 'local'
context.initSucceeded; // boolean
context.initError; // the error from waitForInitialization(), if any
```

These are `@tracked`, so templates that read them auto-update. When the SDK
recovers after a failed initialization (e.g. reconnects), `initStatus`
automatically transitions to `'initialized'`.

You can listen for transitions:

```js
await initialize(clientSideId, user, {
  onStatusChange(newStatus, previousStatus) {
    if (newStatus === "initialized" && previousStatus === "failed") {
      console.log("LaunchDarkly recovered!");
    }
  },
});
```

### Error handling

Runtime errors (stream disconnections, network failures) are captured:

```js
const { context } = await initialize(clientSideId, user, {
  onError(error) {
    Sentry.captureException(error);
  },
});

// Most recent error — reactive
context.lastError; // Error | undefined
```

### SDK passthroughs

These methods delegate directly to the underlying `LDClient`. They are no-ops
in local mode:

```js
// Evaluation reasons (requires evaluationReasons: true in options)
const detail = context.variationDetail("my-flag");
// { value: true, variationIndex: 0, reason: { kind: 'FALLTHROUGH' } }

// Track custom events for Experimentation
context.track("purchase", { item: "shirt" }, 42.0);

// Flush pending events (e.g. before page navigation)
await context.flush();

// Shut down the client and release resources
await context.close();

// Force-close without waiting for flush (useful when endpoint is unresponsive)
await context.close({ force: true });

// Shut down AND remove the context from global state, allowing re-initialization
await context.destroy();
await context.destroy({ force: true }); // force variant

// Direct access to the LDClient for anything else
context.client?.on("change:my-flag", () => {
  /* ... */
});
```

## Local feature flags

When `mode: 'local'`, flags come from `config/environment.js` instead of the
LaunchDarkly service. The context is available at `window.__LD__` for console
debugging:

```js
// config/environment.js
launchDarkly: {
  mode: 'local',
  localFlags: {
    'apply-discount': true,
    'pricing-plan': 'plan-a',
  },
}
```

```js
// Browser console
window.__LD__.get("pricing-plan"); // 'plan-a'
window.__LD__.set("pricing-plan", "plan-b"); // change it
window.__LD__.enable("apply-discount"); // shorthand for set(key, true)
window.__LD__.disable("apply-discount"); // shorthand for set(key, false)
window.__LD__.allFlags; // { 'apply-discount': true, ... }
window.__LD__.user; // { key: 'local-mode-no-user-specified' }

// Persist to localStorage (survives refresh)
window.__LD__.persist();
window.__LD__.resetPersistence();
```

## Streaming feature flags

Subscribe to real-time flag updates via the `streamingFlags` configuration:

```js
// Stream all flags
streamingFlags: true

// Stream all except specific flags
streamingFlags: { allExcept: ['apply-discount', 'new-login'] }

// Stream specific flags only
streamingFlags: { 'apply-discount': true }

// Disable streaming (default)
streamingFlags: false
```

Real-time updates use the [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource). Ensure your target browsers support it or include a polyfill.

## Content Security Policy

If CSP is enabled, add LaunchDarkly to `connect-src`:

```js
// config/environment.js
contentSecurityPolicy: {
  'connect-src': ['https://*.launchdarkly.com'],
},
```

## Test helpers

### Acceptance tests

`setupLaunchDarkly` resets all flags to `false` and provides `withVariation`:

```js
import { module, test } from "qunit";
import { visit, click } from "@ember/test-helpers";
import { setupApplicationTest } from "ember-qunit";
import { setupLaunchDarkly } from "ember-launch-darkly/test-support";

module("Acceptance | Pricing", function (hooks) {
  setupApplicationTest(hooks);
  setupLaunchDarkly(hooks);

  test("shows new pricing when flag is on", async function (assert) {
    await this.withVariation("new-pricing-plan", "plan-a");
    await visit("/pricing");

    assert.dom(".price").hasText("£ 99");
  });
});
```

### Integration tests

```ts
// variation-test.gts
import { module, test } from "qunit";
import { setupRenderingTest } from "ember-qunit";
import { render } from "@ember/test-helpers";

import { setupLaunchDarkly } from "ember-launch-darkly/test-support";
import { variation } from "ember-launch-darkly/helpers";

import type { LDTestContext } from "ember-launch-darkly/test-support";

module("Integration | Helper | variation", function (hooks) {
  setupRenderingTest(hooks);
  setupLaunchDarkly(hooks);

  test("shows discount badge", async function (this: LDTestContext, assert) {
    await this.withVariation?.("apply-discount", true);

    await render(
      <template>
        {{#if (variation "apply-discount")}}
          <span data-test-discount-badge>Discount!</span>
        {{/if}}
      </template>,
    );

    assert.dom("[data-test-discount-badge]").exists();
  });
});
```

### Testing initialization failures

Use `withInitStatus` to simulate degraded states:

```js
test("shows error banner when LD fails", async function (assert) {
  await this.withInitStatus("failed", new Error("timeout"));

  await render(hbs`<StatusBanner />`);

  assert.dom("[data-test-error-banner]").exists();
});
```

## Using the SDK directly (without this addon)

If you prefer not to use this addon, here's how to get reactive feature flags
with the LaunchDarkly SDK and Ember's tracking system directly:

```ts
// app/services/feature-flags.ts
import Service from "@ember/service";
import { tracked } from "@glimmer/tracking";
import { TrackedMap } from "tracked-built-ins";
import * as LDClient from "launchdarkly-js-client-sdk";

export default class FeatureFlagsService extends Service {
  flags = new TrackedMap<string, unknown>();
  @tracked isReady = false;
  @tracked error?: unknown;

  client?: LDClient.LDClient;

  async initialize(clientSideId: string, context: LDClient.LDContext) {
    this.client = LDClient.initialize(clientSideId, context, {
      sendEventsOnlyForVariation: true,
    });

    try {
      await this.client.waitForInitialization(5);
      this.isReady = true;
    } catch (e) {
      this.error = e;
      // Continue with default values
    }

    // Populate initial flags
    const allFlags = this.client.allFlags();
    for (const [key, value] of Object.entries(allFlags)) {
      this.flags.set(key, value);
    }

    // Subscribe to changes for reactive updates
    this.client.on("change", (changes) => {
      for (const [key, { current }] of Object.entries(changes)) {
        this.flags.set(key, current);
      }
    });
  }

  variation(key: string, defaultValue?: unknown): unknown {
    if (this.flags.has(key)) {
      return this.flags.get(key);
    }
    return defaultValue;
  }

  async identify(context: LDClient.LDContext) {
    const flags = await this.client?.identify(context);
    if (flags) {
      this.flags.clear();
      for (const [key, value] of Object.entries(flags)) {
        this.flags.set(key, value);
      }
    }
  }

  willDestroy() {
    super.willDestroy();
    this.client?.close();
  }
}
```

```ts
// app/routes/application.ts
import Route from "@ember/routing/route";
import { service } from "@ember/service";
import type FeatureFlagsService from "my-app/services/feature-flags";
import config from "my-app/config/environment";

export default class ApplicationRoute extends Route {
  @service declare featureFlags: FeatureFlagsService;

  async beforeModel() {
    await this.featureFlags.initialize(config.launchDarkly.clientSideId, {
      kind: "user",
      key: "anonymous",
      anonymous: true,
    });
  }
}
```

```hbs
{{! In a template }}
{{#if this.featureFlags.isReady}}
  {{#if (get this.featureFlags.flags "new-pricing")}}
    <NewPricing />
  {{/if}}
{{/if}}
```

The core idea is `TrackedMap` — it gives you Glimmer reactivity for flag values.
That's essentially what this addon does, plus convention-based config, test
helpers, streaming subscriptions, and the `{{variation}}` template helper.

## Upgrading

- **From v5.x to v6.x** — See [UPGRADING_TO_v6.x.md](UPGRADING_TO_v6.x.md)
- **From v1.x to v2.x** — See [UPGRADING_TO_v2.x.md](UPGRADING_TO_v2.x.md)

<p align="center"><sub>Made with :heart: by The Ember Launch Darkly Team</sub></p>
