import { registerHelper } from '@ember/test';

export function withVariation(app, key, value = true) {
  let client = app.__container__.lookup('service:launch-darkly-client');
  client.setVariation(key, value);
}

registerHelper('withVariation', withVariation);
