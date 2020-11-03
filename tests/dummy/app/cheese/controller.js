import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default class CheeseController extends Controller {
  @service candy;

  get cheese() {
    let val = this.candy.variation('cheese');

    console.log('cheese', val);

    return val;
  }

  get beta() {
    let val = this.candy.variation('ops-beta-features');

    console.log('beta', val);

    return val;
  }

  get bacon() {
    let val = this.candy.variation('cheese');
    console.log('bacon', val);

    if (val) {
      return 'smoked';
    }

    return 'streaky';
  }
}
