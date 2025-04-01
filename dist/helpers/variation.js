import { helper } from '@ember/component/helper';
import { variation as variation$1 } from '../-sdk/variation.js';

function variationHelper([key], {
  defaultValue = null
}) {
  return variation$1(key, defaultValue);
}
var variation = helper(variationHelper);

export { variation as default };
//# sourceMappingURL=variation.js.map
