import { DEBUG } from '@glimmer/env';

let variation;
if (DEBUG) {
  variation = () => {
    throw new Error(
      `

In order to use the "variation" Javascript helper, you must include the ember-launch-darkly babel plugin. See the README (link below) for more details on how this works and some considerations when using it.

https://github.com/ember-launch-darkly/ember-launch-darkly#experimental-variation-javascript-helper
`
    );
  };
}

export { variation };

export { computed as computedWithVariation } from '@ember/object';
