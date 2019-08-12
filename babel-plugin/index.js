const SERVICE_PROPERTY_NAME = 'launchDarkly';

module.exports = function launchDarklyBabelPlugin(babel) {
  const { types: t } = babel;

  const importVisitor = {
    ImportDeclaration(path) {
      if (path.get('source').node.value === 'ember-launch-darkly') {
        let obj = path
          .get('specifiers')
          .find(
            obj =>
              obj.isImportSpecifier() &&
              obj.get('imported').node.name === 'variation'
          );

        if (obj) {
          if (path.get('specifiers').length === 1) {
            path.remove();
          } else {
            obj.remove();
          }
        }
        path.stop();
      }
    }
  };

  return {
    name: 'ember-launch-darkly',
    visitor: {
      Program: {
        exit(path) {
          path.traverse(importVisitor);
        }
      },

      CallExpression(path) {
        if (_isReferenceToComputedHelper(path)) {
          _handleComputedHelper(path, t);
        }

        if (_isReferenceToVariationHelper(path)) {
          _handleVariationHelper(path, t);
        }
      }
    }
  };
};

module.exports.baseDir = function() {
  return __dirname;
};

function _handleComputedHelper(path, t) {
  let state = { flags: [] };
  path.traverse(
    {
      CallExpression(path) {
        if (_isReferenceToVariationHelper(path)) {
          let flagName = path.node.arguments[0] && path.node.arguments[0].value;

          if (flagName) {
            this.flags.push(flagName);
          }
        }
      }
    },
    state
  );

  if (state.flags.length) {
    let dependentKey;

    if (state.flags.length === 1) {
      dependentKey = `${SERVICE_PROPERTY_NAME}.${state.flags[0]}`;
    } else {
      dependentKey = `${SERVICE_PROPERTY_NAME}.{${state.flags.join(',')}}`;
    }

    path.node.arguments.unshift(t.stringLiteral(dependentKey));
  }
}

function _handleVariationHelper(path, t) {
  let flagName = path.node.arguments[0] && path.node.arguments[0].value;

  let ldServiceCallExpression = t.callExpression(
    t.memberExpression(t.thisExpression(), t.identifier('get')),
    [t.stringLiteral(`${SERVICE_PROPERTY_NAME}.${flagName}`)]
  );

  path.replaceWith(ldServiceCallExpression);
}

function _isReferenceToComputedHelper(path) {
  return path
    .get('callee')
    .referencesImport('ember-launch-darkly', 'computedWithVariation');
}

function _isReferenceToVariationHelper(path) {
  return path
    .get('callee')
    .referencesImport('ember-launch-darkly', 'variation');
}
