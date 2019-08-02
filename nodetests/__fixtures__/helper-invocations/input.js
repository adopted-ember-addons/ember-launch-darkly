import Component from '@ember/component';
import { computed } from '@ember/object';

import foo from 'foo';
import { variation } from 'ember-launch-darkly';
import bar from 'bar';

import Ember from 'ember';

export default Component.extend({
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

  baz: computed('launchDarkly.new-login', function () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  boo: computed('launchDarkly.{new-login,apply-discount}', function () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  bop: computed('launchDarkly.{new-login,new-logout}', function () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  yetAnotherPrice: Ember.computed('price', function () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  ben: Ember.computed(function () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  bon: Ember.computed('launchDarkly.apply-discount', function () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  ban: Ember.computed('launchDarkly.new-login', function () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  bin: Ember.computed('launchDarkly.{new-login,apply-discount}', function () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  bun: Ember.computed('launchDarkly.{new-login,new-logout}', function () {
    if (variation('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  goo: computed(function() {
    if(variation('bar') || variation('baz')) {
      return null;
    }
  }),

  gar: computed(function() {
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

    return this.get('price');
  })
});
