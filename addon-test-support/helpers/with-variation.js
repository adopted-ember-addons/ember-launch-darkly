import Ember from 'ember';

export function withVariation(app, key, value = true) {
  let client = app.__container__.lookup('service:launch-darkly-client');
  client.setVariation(key, value);
}

Ember.Test.registerHelper('withVariation', withVariation);
