import Controller from '@ember/controller';

import { variation } from 'ember-launch-darkly';

export default class StreamingFlagsController extends Controller {
  get shape() {
    return variation('shape');
  }
}
