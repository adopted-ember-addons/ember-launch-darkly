/* eslint-env node */
'use strict';

var path = require('path');
var Funnel = require('broccoli-funnel');
var MergeTrees = require('broccoli-merge-trees');

module.exports = {
  name: 'ember-launch-darkly',

  isDevelopingAddon() {
    return true;
  },

  included(app) {
    this._super.included.apply(this, arguments);

    if (!this._registeredWithBabel) {
      app.options = app.options || {};
      app.options.babel = app.options.babel || {};
      app.options.babel.plugins = app.options.babel.plugins || [];

      app.options.babel.plugins.unshift(require('./launch-darkly-variation-helper.js'));

      this._registeredWithBabel = true;
    }

    this.import('vendor/ldclient.js');
  },

  treeForVendor(vendorTree) {
    var ldTree = new Funnel(path.dirname(require.resolve('ldclient-js/dist/ldclient.js')), {
      files: ['ldclient.js'],
    });

    return new MergeTrees([vendorTree, ldTree]);
  }
};
