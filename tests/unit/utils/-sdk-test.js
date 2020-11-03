import { module, test } from 'qunit';

import { initialize } from 'ember-launch-darkly/utils/-sdk';

module('Unit | Utility | sdk', function() {
  module('#initialize', function() {
    test('throws an error when clientSideId is not provided', async function(assert) {
      assert.expect(1);

      try {
        await initialize();
      } catch (e) {
        debugger;
        assert.equal(e.message, 'FOOO');
      }
    });
  });
});
