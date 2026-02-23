import { module, test } from 'qunit';

import Context, { setPersistedFlags } from '#src/-sdk/context.ts';
import type { LDClient } from 'launchdarkly-js-client-sdk';

// TODO: Re-enable setupWindowMock once @embroider/macros isTesting() works with Vite
// See: https://github.com/embroider-build/embroider/pull/2662
// import window from 'ember-window-mock';
// import { setupWindowMock } from 'ember-window-mock/test-support';
module('Unit | SDK | Context', function () {
  // TODO: setupWindowMock(hooks) - blocked on isTesting() upstream fix
  test('constructor', function (assert) {
    let context = new Context({});
    assert.strictEqual(
      Object.keys(context.allFlags).length,
      0,
      'Initialize with no flags',
    );

    context = new Context<Record<string, boolean>>({ foo: true });
    assert.strictEqual(
      Object.keys(context.allFlags).length,
      1,
      'Initialize with flags',
    );
  });

  test('#updateFlags', function (assert) {
    const context = new Context<Record<string, boolean>>({
      foo: true,
      bar: true,
    });

    assert.strictEqual(
      Object.keys(context.allFlags).length,
      2,
      'Initialize with flags',
    );

    context.updateFlags({ bar: false, baz: true });

    assert.deepEqual(
      context.allFlags,
      {
        foo: true,
        bar: false,
        baz: true,
      },
      'Update flags',
    );
  });

  test('#replaceFlags', function (assert) {
    const context = new Context<Record<string, boolean>>({
      foo: true,
      bar: true,
    });

    assert.strictEqual(
      Object.keys(context.allFlags).length,
      2,
      'Initialize with flags',
    );

    context.replaceFlags({ bar: false, baz: true });

    assert.deepEqual(
      context.allFlags,
      {
        bar: false,
        baz: true,
      },
      'Replace flags',
    );
  });

  test('#enable', function (assert) {
    const context = new Context({ foo: true, bar: false });

    assert.deepEqual(
      context.allFlags,
      { foo: true, bar: false },
      'Initial flag state',
    );

    context.enable('bar');

    assert.deepEqual(
      context.allFlags,
      { foo: true, bar: true },
      'Updated flag state',
    );
  });

  test('#disable', function (assert) {
    const context = new Context({ foo: true, bar: false });

    assert.deepEqual(
      context.allFlags,
      { foo: true, bar: false },
      'Initial flag state',
    );

    context.disable('foo');

    assert.deepEqual(
      context.allFlags,
      { foo: false, bar: false },
      'Updated flag state',
    );
  });

  test('#set', function (assert) {
    const context = new Context({ foo: true, bar: false });

    assert.deepEqual(
      context.allFlags,
      { foo: true, bar: false },
      'Initial flag state',
    );

    context.set('foo', 'baz');

    assert.deepEqual(
      context.allFlags,
      { foo: 'baz', bar: false },
      'Updated flag state',
    );
  });

  test('#get', function (assert) {
    const context = new Context<Record<string, unknown>>({
      foo: true,
      bar: false,
    });

    assert.true(context.get('foo'), 'Initial flag state');
    assert.strictEqual(
      context.get('moo', 'bah'),
      'bah',
      `Return default value if flag doesn't exist`,
    );
  });

  test('allFlags', function (assert) {
    const context = new Context({ foo: true, bar: false });

    const flags = context.allFlags;

    assert.deepEqual(
      flags,
      { foo: true, bar: false },
      'All flags accounted for',
    );
  });

  test('isLocal', function (assert) {
    assert.true(new Context({}).isLocal, 'Operating in local mode');
    assert.false(
      new Context({}, {} as LDClient).isLocal,
      'Operating in remote mode',
    );
  });

  test('user', function (assert) {
    const client = {
      getContext() {
        return { key: 'foo' };
      },
    } as unknown as LDClient;

    assert.deepEqual(new Context({}).user, {
      key: 'local-mode-no-user-specified',
    });
    assert.deepEqual(new Context({}, client).user, { key: 'foo' });
  });

  module('#persistence', function (innerHooks) {
    // TODO: Replace with setupWindowMock once isTesting() is fixed upstream
    // See: https://github.com/embroider-build/embroider/pull/2662
    innerHooks.afterEach(function () {
      globalThis.localStorage.removeItem('ember-launch-darkly');
    });

    test('#persist / persisted', function (assert) {
      const context = new Context({ foo: true, bar: false });
      context.persist();

      assert.deepEqual(
        context.persisted,
        { foo: true, bar: false },
        'Flags persisted in local storage',
      );
    });

    test('#setPersistedFlags', function (assert) {
      globalThis.localStorage.setItem(
        'ember-launch-darkly',
        JSON.stringify({ foo: true, bar: false }),
      );

      const context = new Context({});
      setPersistedFlags(context);

      assert.deepEqual(
        context.allFlags,
        { foo: true, bar: false },
        'Flags loaded from local storage',
      );
    });

    test('#resetPersistence', function (assert) {
      const context = new Context({ foo: true, bar: false });
      context.persist();
      context.resetPersistence();

      assert.strictEqual(
        context.persisted,
        undefined,
        'Flags removed from local storage',
      );
    });
  });
});
