import resolver from './helpers/resolver';
import {
  setResolver
} from 'ember-qunit';
import { start } from 'ember-cli-qunit';

import 'ember-launch-darkly/test-support/helpers/with-variation';

setResolver(resolver);
start();
