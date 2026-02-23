import { module, test } from 'qunit';

import { shouldUpdateFlag } from '#src/-sdk/initialize.ts';

module('Unit | SDK | Initialize', function () {
  module('#shouldUpdateFlag', function () {
    test('it works', function (assert) {
      assert.false(shouldUpdateFlag('foo'), 'Config not provided');
      assert.false(shouldUpdateFlag('foo', {}), 'Empty object provided');

      assert.false(shouldUpdateFlag('foo', false), 'Stream no flags');
      assert.false(
        shouldUpdateFlag('foo', { allExcept: ['foo'] }),
        'Stream all flags except this flag',
      );
      assert.false(
        shouldUpdateFlag('foo', { foo: false }),
        'Specifically do not stream this flag',
      );
      assert.false(
        shouldUpdateFlag('foo', { foo: 666 }),
        'Invalid value for specific flag',
      );
      assert.false(
        shouldUpdateFlag('foo', { allExcept: true as unknown as string[] }),
        'Invalid value for allExcept',
      );

      assert.true(shouldUpdateFlag('foo', true), 'Stream all flags');
      assert.true(
        shouldUpdateFlag('foo', { allExcept: ['bar'] }),
        'Stream all flags except another flag',
      );
      assert.true(
        shouldUpdateFlag('foo', { foo: true }),
        'Specifically stream this flag',
      );
    });
  });
});
