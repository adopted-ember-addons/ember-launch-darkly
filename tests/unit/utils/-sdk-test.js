import { module, test } from 'qunit';

import { Context, shouldUpdateFlag } from 'ember-launch-darkly/utils/-sdk';

module('Unit | Utility | sdk', function() {
  module('Context', function() {
    test('constructor', function(assert) {
      let context = new Context({});
      assert.equal(
        Object.keys(context.allFlags).length,
        0,
        'Initialize with no flags'
      );

      context = new Context({ foo: true });
      assert.equal(
        Object.keys(context.allFlags).length,
        1,
        'Initialize with flags'
      );
    });

    test('#updateFlags', function(assert) {
      let context = new Context({ foo: true });

      assert.equal(
        Object.keys(context.allFlags).length,
        1,
        'Initialize with flags'
      );

      context.updateFlags({ foo: false, bar: false });

      assert.equal(Object.keys(context.allFlags).length, 2, 'Update flags');
    });

    test('#enable', function(assert) {
      let context = new Context({ foo: true, bar: false });

      assert.deepEqual(
        context.allFlags,
        { foo: true, bar: false },
        'Initial flag state'
      );

      context.enable('bar');

      assert.deepEqual(
        context.allFlags,
        { foo: true, bar: true },
        'Updated flag state'
      );
    });

    test('#disable', function(assert) {
      let context = new Context({ foo: true, bar: false });

      assert.deepEqual(
        context.allFlags,
        { foo: true, bar: false },
        'Initial flag state'
      );

      context.disable('foo');

      assert.deepEqual(
        context.allFlags,
        { foo: false, bar: false },
        'Updated flag state'
      );
    });

    test('#set', function(assert) {
      let context = new Context({ foo: true, bar: false });

      assert.deepEqual(
        context.allFlags,
        { foo: true, bar: false },
        'Initial flag state'
      );

      context.set('foo', 'baz');

      assert.deepEqual(
        context.allFlags,
        { foo: 'baz', bar: false },
        'Updated flag state'
      );
    });

    test('#get', function(assert) {
      assert.expect(1);

      let context = new Context({ foo: true, bar: false });

      assert.equal(context.get('foo'), true, 'Initial flag state');
    });

    test('allFlags', function(assert) {
      let context = new Context({ foo: true, bar: false });

      let flags = context.allFlags;

      assert.deepEqual(
        flags,
        { foo: true, bar: false },
        'All flags accounted for'
      );
    });

    test('isLocal', function(assert) {
      assert.equal(new Context({}).isLocal, true, 'Operating in local mode');
      assert.equal(
        new Context({}, {}).isLocal,
        false,
        'Operating in remote mode'
      );
    });
  });

  module('#shouldUpdateFlag', function() {
    test('it works', async function(assert) {
      assert.equal(shouldUpdateFlag('foo'), false, 'Config not provided');
      assert.equal(shouldUpdateFlag('foo', {}), false, 'Empty object provided');

      assert.equal(shouldUpdateFlag('foo', false), false, 'Stream no flags');
      assert.equal(
        shouldUpdateFlag('foo', { allExcept: ['foo'] }),
        false,
        'Stream all flags except this flag'
      );
      assert.equal(
        shouldUpdateFlag('foo', { foo: false }),
        false,
        'Specifically do not stream this flag'
      );
      assert.equal(
        shouldUpdateFlag('foo', { foo: 666 }),
        false,
        'Invalid value for specific flag'
      );
      assert.equal(
        shouldUpdateFlag('foo', { allExcept: true }),
        false,
        'Invalid value for allExcept'
      );

      assert.equal(shouldUpdateFlag('foo', true), true, 'Stream all flags');
      assert.equal(
        shouldUpdateFlag('foo', { allExcept: ['bar'] }),
        true,
        'Stream all flags except another flag'
      );
      assert.equal(
        shouldUpdateFlag('foo', { foo: true }),
        true,
        'Specifically stream this flag'
      );
    });
  });
});
