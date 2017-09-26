import Controller from 'ember-controller';
import service from 'ember-service/inject';
import computed from 'ember-computed';

import { variation } from 'ember-launch-darkly';

export default Controller.extend({
  launchDarkly: service(),

  // BEGIN-SNIPPET as-cp-dependent-key
  price: computed('launchDarkly.apply-discount', function() {
    if (this.get('launchDarkly.apply-discount')) {
      return '99';
    }

    return '199';
  }),
  // END-SNIPPET

  // BEGIN-SNIPPET as-variation-call
  anotherPrice: computed(function() {
    if (this.get('launchDarkly').variation('apply-discount')) {
      return '99';
    }

    return '199';
  }),
  // END-SNIPPET

  // BEGIN-SNIPPET as-cp-alias
  shouldApplyDiscount: computed.alias('launchDarkly.apply-discount'),

  yetAnotherPrice: computed('shouldApplyDiscount', function() {
    if (this.get('shouldApplyDiscount')) {
      return '99';
    }

    return '199';
  }),
  // END-SNIPPET

  // BEGIN-SNIPPET as-js-variation-helper
  foo: computed(function () {
    if (variation('apply-discount')) {
      return '99';
    }

    return '199';
  })
  // END-SNIPPET
});
