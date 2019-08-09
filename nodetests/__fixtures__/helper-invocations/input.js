import Component from '@ember/component';
import {computed } from '@ember/object';
import EmberObject from '@ember/object';
import { inject as service } from '@ember/service';

import { variation } from 'ember-launch-darkly';

import { task } from 'ember-concurrency';

export default Component.extend({
  launchDarkly: service(),

  price: Ember.computed('price', function () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  foo: Ember.computed(function () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  bar: Ember.computed('launchDarkly.apply-discount', function () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  baz: Ember.computed(function() {
    if(variation('bar') || variation('baz')) {
      return null;
    }
  }),

  bop: Ember.computed(function() {
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
