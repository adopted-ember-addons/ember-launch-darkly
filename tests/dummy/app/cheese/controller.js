import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

import { foobar as variation } from 'ember-launch-darkly';

export default class CheeseController extends Controller {
  @service candy;

  get cheese() {
    let val = variation('cheese');

    console.log('cheese', val);

    return val;
  }

  get beta() {
    let val = variation('ops-beta-features');

    console.log('beta', val);

    return val;
  }

  get bacon() {
    let val = variation('cheese');
    console.log('bacon', val);

    if (val) {
      return 'smoked';
    }

    return 'streaky';
  }
}
