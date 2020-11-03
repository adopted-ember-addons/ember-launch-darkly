import { helper } from '@ember/component/helper';
//import { inject as service } from '@ember/service';

//export default class WoopHelper extends Helper {
//@service candy;

//compute([key]) {
//let val = this.candy.variation(key);

//console.log('helper', key, val);

//return val;
//}
//}

import { foobar as variation } from 'ember-launch-darkly';

function variationHelper([key]) {
  return variation(key);
}

export default helper(variationHelper);
