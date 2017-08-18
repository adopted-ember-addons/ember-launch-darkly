import Ember from 'ember';

export function withVariation(app, key, value = true) {
  let launchDarkly = app.__container__.lookup('service:launch-darkly');
  launchDarkly.variation(key, value);
}

Ember.Test.registerHelper('withVariation', withVariation);
