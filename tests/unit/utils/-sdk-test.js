import { module, test } from 'qunit';

import { initialize } from 'ember-launch-darkly/utils/-sdk';

module('Unit | Utility | sdk', function() {
  module('#initialize', function() {
    test('throws an error when clientSideId is not provided', async function(assert) {
      assert.expect(2);

      try {
        await initialize();
      } catch (e) {
        assert.equal(
          e.constructor.prototype.name,
          'LaunchDarklyInvalidEnvironmentIdError'
        );

        assert.equal(
          e.message,
          'No environment/client-side ID was specified. Please see https://docs.launchdarkly.com/docs/js-sdk-reference#section-initializing-the-client for instructions on SDK initialization.'
        );
      }
    });

    test('throws an error if invalid user isprovided', async function(assert) {
      assert.expect(2);
      try {
        await initialize('cheese');
      } catch (e) {
        assert.equal(
          e.constructor.prototype.name,
          'LaunchDarklyInvalidUserError'
        );

        assert.equal(
          e.message,
          'Invalid user specified. Please see https://docs.launchdarkly.com/docs/js-sdk-reference#section-initializing-the-client for instructions on SDK initialization.'
        );
      }
    });

    test('Error experienced when fetching flag settings', async function(assert) {
      assert.expect(2);

      try {
        await initialize('invalid-client-side-id', { key: 'blah' });
      } catch (e) {
        assert.equal(
          e.constructor.prototype.name,
          'LaunchDarklyFlagFetchError'
        );

        assert.equal(e.message, 'Error fetching flag settings: 400');
      }
    });
  });
});
