import { helper } from '@ember/component/helper';
import { variation } from '../-sdk/variation.ts';

function variationHelper([key]: [string], { defaultValue = null }) {
  return variation(key, defaultValue);
}

export default helper(variationHelper);
