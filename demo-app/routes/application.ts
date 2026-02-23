import Route from '@ember/routing/route';

import { initialize } from 'ember-launch-darkly';

export default class ApplicationRoute extends Route {
  async model() {
    await initialize({
      clientSideId: '5c816f3fb510dd21a8607b72',
      user: { anonymous: true },
      mode: 'remote',
      streamingFlags: {
        'make-shape-blink': true,
      },
      localFlags: {
        shape: 'square',
        'shape-background-color': 'purple',
        'make-shape-blink': false,
      },
      bootstrap: 'localFlags',
    });
  }
}
