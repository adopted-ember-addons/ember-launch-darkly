import Component from '@ember/component';
import { computed } from '@ember/object';
import EmberObject from '@ember/object';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency';
export default Component.extend({
  ldService: Ember.inject.service("launchDarkly"),
  launchDarkly: service(),
  price: Ember.computed("ldService.apply-discount", 'price', function () {
    if (this.get("ldService.apply-discount")) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),
  foo: Ember.computed("ldService.apply-discount", function () {
    if (this.get("ldService.apply-discount")) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),
  bar: Ember.computed("ldService.apply-discount", 'launchDarkly.apply-discount', function () {
    if (this.get("ldService.apply-discount")) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  }),
  baz: Ember.computed("ldService.baz", "ldService.bar", function () {
    if (this.get("ldService.bar") || this.get("ldService.baz")) {
      return null;
    }
  }),
  bop: Ember.computed("ldService.bar", function () {
    return EmberObject.create({
      bar() {
        if (this.get("ldService.bar")) {
          return null;
        }
      }

    });
  }),

  otherPrice() {
    if (this.get("ldService.apply-discount")) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  },

  yar: function () {
    if (this.get("ldService.apply-discount")) {
      return this.get('price') * 0.5;
    }

    return this.get('price');
  },
  mar: task(function* () {
    if (this.get("ldService.apply-discount")) {
      return this.get('price') * 0.5;
    }

    return yield this.get('price');
  })
});
