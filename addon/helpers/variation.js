import Helper from '@ember/component/helper';
import { inject as service } from '@ember/service';

export default Helper.extend({
  launchDarkly: service(),

  compute([key]) {
    let service = this.get('launchDarkly');

    if (!this._key) {
      this._key = key;
      service.addObserver(key, this, 'recompute');
    }

    return service.get(key);
  },

  destroy() {
    let service = this.get('launchDarkly');

    if (this._key) {
      service.removeObserver(this._key, this, 'recompute');
    }

    return this._super();
  }
});

