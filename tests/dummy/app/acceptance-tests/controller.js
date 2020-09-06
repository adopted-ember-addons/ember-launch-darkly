import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { variation, computedWithVariation as computed } from 'ember-launch-darkly';

export default Controller.extend({
  launchDarkly: service(),
  launchDarklyClient: service(),

  singleVariationComputed: computed(function() {
    return variation('foobar');
  }),

  multipleVariationComputed: computed(function() {
    if (variation('boobaz')) {
      //Do something here
    }

    return variation('foobar');
  }),

  actions: {
    toggleVariation(flag) {
      let currentValue = this.launchDarkly.variation(flag);
      this.launchDarklyClient.setVariation(flag, !currentValue);
    }
  }

});
