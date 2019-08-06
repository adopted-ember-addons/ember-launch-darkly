/* eslint-disable */

const SERVICE_PROPERTY_NAME = 'ldService';

module.exports = function launchDarklyVariationHelperPlugin({ types: t }) {
  return {
    name: 'launch-darkly-variation-helper',
    visitor: {
      Program: {
        enter(path, state) {
          let variationHelperImport = _findVariationHelperImport(path, t);

          if (variationHelperImport && _isReferenced(variationHelperImport, t)) {
            state.shouldInjectLaunchDarklyService = true;
          }
        },

        exit(path) {
          let variationHelperImport = _findVariationHelperImport(path, t);

          if (variationHelperImport) {
            _removeVariationHelperImport(variationHelperImport, t);
          }
        }
      },

      Identifier(path) {
        if (_isReferenceToVariationHelper(path)) {
          let variationHelperCallExpression = path.findParent(p => t.isCallExpression(p));

          if (_isVariationHelperInsideComputedProperty(variationHelperCallExpression, t)) {
            _insertFeatureFlagAsComputedPropertyDependentKey(variationHelperCallExpression, t);
          }

          _replaceVariationHelperCallWithLaunchDarklyServiceCall(variationHelperCallExpression, t);
        }
      },

      CallExpression(path, state) {
        if (state.shouldInjectLaunchDarklyService) {
          _insertLaunchDarklyServiceInjectionIntoTopLevelObject(path, t);
          state.shouldInjectLaunchDarklyService = false;
        }
      }
    }
  };
}

module.exports.baseDir = function() { return __dirname };

function _isReferenceToVariationHelper(path) {
  return path.referencesImport('ember-launch-darkly', 'variation');
}

function _replaceVariationHelperCallWithLaunchDarklyServiceCall(path, t) {
  let featureFlagKey = path.get('arguments.0').node.value;

  let launchDarklyServiceCallExpression = t.callExpression(
    t.memberExpression(t.thisExpression(),
    t.identifier('get')),
    [t.stringLiteral(`${SERVICE_PROPERTY_NAME}.${featureFlagKey}`)]
  );

  path.replaceWith(launchDarklyServiceCallExpression);
}

function _isVariationHelperInsideComputedProperty(path, t) {
  return !!_findParentComputedProperty(path, t);
}

function _insertFeatureFlagAsComputedPropertyDependentKey(path, t) {
  let featureFlagKey = path.get('arguments.0').node.value;
  let dependentKey = `${SERVICE_PROPERTY_NAME}.${featureFlagKey}`;
  let parent = _findParentComputedProperty(path, t);

  parent.node.arguments.unshift(t.stringLiteral(dependentKey));
}

function _findParentComputedProperty(path, t) {
  let parentComputed = path.findParent(p => {
    let isComputed = false;

    if (t.isCallExpression(p)) {
      let callee = p.get('callee');

      if (t.isMemberExpression(callee)) {
        if (callee.node.object.name === 'Ember' && callee.node.property.name === 'computed') {
          isComputed = true;
        }
      }
    }

    return isComputed;
  });

  return parentComputed;
}

function _findVariationHelperImport(path, t) {
  return path.get('body')
    .filter(obj => t.isImportDeclaration(obj))
    .find(obj => _isVariationImport(obj, t));
}

function _importSpecifier(path, t) {
  return path.get('specifiers')
    .find(obj => t.isImportSpecifier(obj) && obj.get('imported').node.name === 'variation');
}

function _isVariationImport(path, t) {
  if (path.get('source').node.value === 'ember-launch-darkly') {
    let specifier = _importSpecifier(path, t);

    return !!specifier;
  }
}

function _isReferenced(path, t) {
  let specifier = _importSpecifier(path, t);
  let localName = specifier.get('local').node.name;
  return specifier.scope.bindings[localName].references > 0;
}

function _isOnlyImportFromModule(path) {
  return path.get('specifiers').length === 1;
}

function _removeVariationHelperImport(path, t) {
  if (_isOnlyImportFromModule(path)) {
    path.remove();
  } else {
    _importSpecifier(path, t).remove();
  }
}

function _insertLaunchDarklyServiceInjectionIntoTopLevelObject(path, t) {
  let callee = path.get('callee');

  if (t.isMemberExpression(callee)) {
    let property = callee.get('property');

    if (t.isIdentifier(property) && property.node.name === 'extend') {
      let object = path.get('arguments').find(arg => t.isObjectExpression(arg));

      if (object) {
        object.unshiftContainer('properties', _buildServiceInjection(t));
      }
    }
  }
}

function _buildServiceInjection(t) {
  return t.objectProperty(
    t.identifier(SERVICE_PROPERTY_NAME),
    t.callExpression(
      t.identifier('Ember.inject.service'),
      [t.stringLiteral('launchDarkly')]
    )
  );
}
