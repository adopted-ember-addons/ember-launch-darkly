# Upgrading to 7.x

v7 no longer re-exports the `variation` helper into your app, whatever your
build. Templates that import the helper (`.gts`/`.gjs`) are unaffected.
Anything that looks `{{variation}}` up by name, such as loose mode (`.hbs`)
templates and `hbs` render tests, fails to resolve it until the app provides
it.

## Why

An app that defines its own `app/helpers/variation` in `.ts`, `.gts` or
`.gjs`, for example to wrap flag lookups, doesn't replace the addon's `.js`
re-export in classic ember-cli builds. Both modules get compiled to the same
output, and whichever finishes last wins, so the app's override is silently
dropped in some builds.

## Migrating

Re-export the helper from your app:

```js
// app/helpers/variation.js
export { default } from "ember-launch-darkly/helpers/variation";
```

Or import it where you use it in strict mode templates:

```gts
import { variation } from "ember-launch-darkly/helpers";
```

If your app already has its own `app/helpers/variation`, there is nothing to
do.

The addon's Glint registry (`ember-launch-darkly/template-registry`) still
declares `variation`. It only provides the types, so it doesn't replace the
re-export.
