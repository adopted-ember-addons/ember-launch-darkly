import Component from '@ember/component';
import {computed } from '@ember/object';
import EmberObject from '@ember/object';
import { inject as service } from '@ember/service';

import { variation } from 'ember-launch-darkly';

import { task } from 'ember-concurrency';

export default Component.extend({
  launchDarkly: service(),

  price: computed('price', function () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  foo: computed(function () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  bar: computed('launchDarkly.apply-discount', function () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  baz: computed(function() {
    if(variation('bar') || variation('baz')) {
      return null;
    }
  }),

  bop: computed(function() {
    return EmberObject.create({
      bar() {
        if(variation('bar')) {
          return null;
        }
      }
    });
  }),

  otherPrice() {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  },

  yar: function() {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  },

  mar: task(function* () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return yield this.get('price');
  })
});
