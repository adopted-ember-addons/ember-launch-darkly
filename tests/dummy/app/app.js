import Application from '@ember/application';
import Resolver from 'ember-resolver';
import loadInitializers from 'ember-load-initializers';
import config from 'dummy/config/environment';

import { initialize } from 'ember-launch-darkly';

function startLaunchDarkly() {
  initialize(
    config.launchDarkly.clientSideId,
    { key: 'CHEESE' },
    config.launchDarkly
  );
}

startLaunchDarkly();

export default class App extends Application {
  modulePrefix = config.modulePrefix;
  podModulePrefix = config.podModulePrefix;
  Resolver = Resolver;
}

loadInitializers(App, config.modulePrefix);
