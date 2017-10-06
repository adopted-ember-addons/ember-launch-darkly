import Helper from 'ember-helper';
import service from 'ember-service/inject';

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

