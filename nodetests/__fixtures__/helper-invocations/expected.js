import { inject as launchDarklyService } from '@ember/service';
import Component from '@ember/component';
import { computed } from '@ember/object';

import foo from 'foo';

import bar from 'bar';

import Ember from 'ember';

export default Component.extend({
  launchDarkly: launchDarklyService(),

  price: computed('launchDarkly.apply-discount', 'price', function () {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  foo: computed('launchDarkly.apply-discount', function () {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  bar: computed('launchDarkly.apply-discount', function () {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  baz: computed('launchDarkly.apply-discount', 'launchDarkly.new-login', function () {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  boo: computed('launchDarkly.{new-login,apply-discount}', function () {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  bop: computed('launchDarkly.apply-discount', 'launchDarkly.{new-login,new-logout}', function () {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  yetAnotherPrice: Ember.computed('launchDarkly.apply-discount', 'price', function () {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  ben: Ember.computed('launchDarkly.apply-discount', function () {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  bon: Ember.computed('launchDarkly.apply-discount', function () {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  ban: Ember.computed('launchDarkly.apply-discount', 'launchDarkly.new-login', function () {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  bin: Ember.computed('launchDarkly.{new-login,apply-discount}', function () {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  bun: Ember.computed('launchDarkly.apply-discount', 'launchDarkly.{new-login,new-logout}', function () {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),

  goo: computed('launchDarkly.baz', 'launchDarkly.bar', function () {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('bar') || launchDarkly.get('baz')) {
      return null;
    }
  }),

  gar: computed('launchDarkly.bar', function () {
    const launchDarkly = this.get('launchDarkly');

    return EmberObject.create({
      bar() {
        if (launchDarkly.get('bar')) {
          return null;
        }
      }
    });
  }),

  otherPrice() {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  },

  yar: function () {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  },

  mar: task(function* () {
    const launchDarkly = this.get('launchDarkly');

    if (launchDarkly.get('apply-discount')) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  })
});
