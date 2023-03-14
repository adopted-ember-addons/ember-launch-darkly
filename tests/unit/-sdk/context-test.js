import { module, test } from 'qunit';

import Context, { setPersistedFlags } from 'ember-launch-darkly/-sdk/context';

module('Unit | SDK | Context', function () {
  test('constructor', function (assert) {
    let context = new Context({});
    assert.strictEqual(
      Object.keys(context.allFlags).length,
      0,
      'Initialize with no flags'
    );

    context = new Context({ foo: true });
    assert.strictEqual(
      Object.keys(context.allFlags).length,
      1,
      'Initialize with flags'
    );
  });

  test('#updateFlags', function (assert) {
    let context = new Context({ foo: true, bar: true });

    assert.strictEqual(
      Object.keys(context.allFlags).length,
      2,
      'Initialize with flags'
    );

    context.updateFlags({ bar: false, baz: true });

    assert.deepEqual(
      context.allFlags,
      {
        foo: true,
        bar: false,
        baz: true,
      },
      'Update flags'
    );
  });

  test('#replaceFlags', function (assert) {
    let context = new Context({ foo: true, bar: true });

    assert.strictEqual(
      Object.keys(context.allFlags).length,
      2,
      'Initialize with flags'
    );

    context.replaceFlags({ bar: false, baz: true });

    assert.deepEqual(
      context.allFlags,
      {
        bar: false,
        baz: true,
      },
      'Replace flags'
    );
  });

  test('#enable', function (assert) {
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

  test('#disable', function (assert) {
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

  test('#set', function (assert) {
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

  test('#get', function (assert) {
    let context = new Context({ foo: true, bar: false });

    assert.true(context.get('foo'), 'Initial flag state');
    assert.strictEqual(
      context.get('moo', 'bah'),
      'bah',
      `Return default value if flag doesn't exist`
    );
  });

  test('allFlags', function (assert) {
    let context = new Context({ foo: true, bar: false });

    let flags = context.allFlags;

    assert.deepEqual(
      flags,
      { foo: true, bar: false },
      'All flags accounted for'
    );
  });

  test('isLocal', function (assert) {
    assert.true(new Context({}).isLocal, 'Operating in local mode');
    assert.false(new Context({}, {}).isLocal, 'Operating in remote mode');
  });

  test('user', function (assert) {
    let client = {
      getUser() {
        return { key: 'foo' };
      },
    };

    assert.deepEqual(new Context({}).user, {
      key: 'local-mode-no-user-specified',
    });
    assert.deepEqual(new Context({}, client).user, { key: 'foo' });
  });

  module('#persistence', function (innerHooks) {
    innerHooks.afterEach(function () {
      window.localStorage.removeItem('ember-launch-darkly');
    });

    test('#persist / persisted', function (assert) {
      let context = new Context({ foo: true, bar: false });
      context.persist();

      assert.deepEqual(
        context.persisted,
        { foo: true, bar: false },
        'Flags persisted in local storage'
      );
    });

    test('#setPersistedFlags', function (assert) {
      window.localStorage.setItem(
        'ember-launch-darkly',
        JSON.stringify({ foo: true, bar: false })
      );
      let context = new Context({ foo: false, bar: true });
      setPersistedFlags(context);

      assert.deepEqual(
        context.allFlags,
        { foo: true, bar: false },
        'Persisted flags were set to context'
      );
    });
  });
});
