import { helper } from '@ember/component/helper';
import { variation } from '../-sdk/variation.js';

function variationHelper([key], { defaultValue = null }) {
  return variation(key, defaultValue);
}

export default helper(variationHelper);
