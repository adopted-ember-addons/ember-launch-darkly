const MODULE_NAME = 'ember-launch-darkly';
const MEMBER_NAME = 'variation';
const SERVICE_PROPERTY_NAME = 'launchDarkly';
const SERVICE_VARIABLE_NAME = 'launchDarkly';
const SERVICE_INJECTION_FUNCTION_NAME = 'launchDarklyService';

const COMPUTED_MODULE_NAME = 'ember-computed';
const NEW_COMPUTED_MODULE_NAME = '@ember/object';
const COMPUTED_DEFAULT_MEMBER_NAME = 'default';
const COMPUTED_MEMBER_NAME = 'computed';

const EMBER_MODULE_NAME = 'ember';
const EMBER_DEFAULT_MEMBER_NAME = 'default';

function _assertName(path, value) {
  return path.node.name === value;
}

module.exports = function launchDarklyVariationHelperPlugin({ types: t }) {
  return {
    name: 'launch-darkly-variation-helper',
    visitor: {
      Program: {
        enter(path, state) {
          let variationImport = _findVariationHelperImport(path, t);

          if (variationImport && _isReferenced(variationImport, t)) {
            state.variationHelperReferenced = true;
          }
        },

        exit(path, state) {
          let variationImport = _findVariationHelperImport(path, t);

          if (variationImport) {
            _removeSpecifierOrImport(variationImport, t);

            if (state.variationHelperReferenced) {
              _insertServiceImport(path, t);
            }
          }
        }
      },

      Identifier(path, state) {
        if (path.referencesImport(MODULE_NAME, MEMBER_NAME)) {
          let parentCallExpression = path.findParent(p => t.isCallExpression(p));
          let key = parentCallExpression.get('arguments.0').node.value;
          parentCallExpression.replaceWith(_build(key, t));

          let { parent, type } = _findParent(parentCallExpression, t);

          switch (type) {
            case 'computed-property': {
              let dependentKey = `${SERVICE_PROPERTY_NAME}.${key}`;

              if (_shouldInjectDependentKey(key, parent, t)) {
                parent.node.arguments.unshift(t.stringLiteral(dependentKey));
              }

              let fn = parent.get('arguments').find(a => t.isFunctionExpression(a));

              if (fn && !_containsServiceDeclaration(fn, t)) {
                _insertServiceDeclaration(fn, t);
              }

              return;
            }
            case 'function': {
              _insertServiceDeclaration(parent, t);
              return;
            }
          }
        }
      },

      CallExpression(path, state) {
        if (state.variationHelperReferenced) {
          _insertServiceInjection(path, t);
        }
      }
    }
  };
}

module.exports.baseDir = function() { return __dirname };

function _insertServiceDeclaration(path, t) {
  path.get('body').unshiftContainer('body', _buildServiceDeclaration(t));
}

function _findParent(path, t) {
  let parentComputed = path.findParent(p => {
    let isComputed = t.isCallExpression(p) &&
      t.isIdentifier(p.get('callee')) &&
      (_referencesComputedImport(p.get('callee')) || _referencesComputedDeclaration(p.get('callee')));
    let isEmberDotComputed = t.isCallExpression(p) &&
      t.isMemberExpression(p.get('callee')) &&
      p.get('callee.object').referencesImport(EMBER_MODULE_NAME, EMBER_DEFAULT_MEMBER_NAME) &&
      _assertName(p.get('callee.property'), 'computed');

    return isComputed || isEmberDotComputed;
  });

  if (parentComputed) {
    return { parent: parentComputed, type: 'computed-property' }
  }

  let parentObjectMethod = path.findParent(p => t.isObjectMethod(p) || t.isFunctionExpression(p));

  if (parentObjectMethod) {
    return { parent: parentObjectMethod, type: 'function' };
  }
}

function _referencesComputedImport(path) {
  return path.referencesImport(COMPUTED_MODULE_NAME, COMPUTED_DEFAULT_MEMBER_NAME) || path.referencesImport(NEW_COMPUTED_MODULE_NAME, COMPUTED_MEMBER_NAME);
}

function _referencesComputedDeclaration(path) {
  var result = Object.keys(path.scope.bindings).map(function(key) {
    if (key === COMPUTED_MEMBER_NAME && key === path.node.name) {
      var binding = path.scope.bindings[key];

      if (binding.referencePaths.indexOf(path) > -1) {
        return true;
      }
    }
  }).filter(Boolean);

  return result.length > 0;
}

function _buildServiceDeclaration(t) {
  let memberExpression = t.memberExpression(t.thisExpression(), t.identifier('get'));
  let callExpression = t.callExpression(memberExpression, [t.stringLiteral(SERVICE_PROPERTY_NAME)]);
  let variableDeclarator = t.variableDeclarator(t.identifier(SERVICE_VARIABLE_NAME), callExpression);
  return t.variableDeclaration('const', [variableDeclarator]);
}

function _findVariationHelperImport(path, t) {
  return path.get('body')
    .filter(obj => t.isImportDeclaration(obj))
    .find(obj => _isVariationImport(obj, t));
}

function _importSpecifier(path, t) {
  return path.get('specifiers')
    .find(obj => t.isImportSpecifier(obj) && _assertName(obj.get('imported'), MEMBER_NAME));
}

function _isVariationImport(path, t) {
  if (path.get('source').node.value === MODULE_NAME) {
    let specifier = _importSpecifier(path, t);

    return !!specifier;
  }
}

function _isReferenced(path, t) {
  let specifier = _importSpecifier(path, t);
  let localName = specifier.get('local').node.name;
  return specifier.scope.bindings[localName].references > 0;
}

function _removeSpecifierOrImport(path, t) {
  if (path.get('specifiers').length > 1) {
    _importSpecifier(path, t).remove();
  } else {
    path.remove();
  }
}

function _insertServiceImport(path, t) {
  path.unshiftContainer('body', _buildServiceImport(t));
}

function _buildServiceImport(t) {
  var specifier = t.importSpecifier(t.identifier(SERVICE_INJECTION_FUNCTION_NAME), t.identifier('default'));
  return t.importDeclaration([specifier], t.stringLiteral('ember-service/inject'));
}

function _insertServiceInjection(path, t) {
  let callee = path.get('callee');

  if (t.isMemberExpression(callee)) {
    let property = callee.get('property');

    if (t.isIdentifier(property) && _assertName(property, 'extend')) {
      let object = path.get('arguments').find(arg => t.isObjectExpression(arg));

      if (object) {
        object.unshiftContainer('properties', _buildServiceInjection(t));
      }
    }
  }
}

function _buildServiceInjection(t) {
  return t.objectProperty(t.identifier(SERVICE_PROPERTY_NAME), t.callExpression(t.identifier(SERVICE_INJECTION_FUNCTION_NAME), []));
}


function _containsServiceDeclaration(path, t) {
  let declaration = path.get('body.body')
    .filter(a => t.isVariableDeclaration(a))
    .find(a => {
      return _assertName(a.get('declarations.0.id'), SERVICE_VARIABLE_NAME);
    })

  return !!declaration;
}

function _shouldInjectDependentKey(key, path, t) {
  let found = path.get('arguments').find(a => {
    return t.isStringLiteral(a) && _containsDependentKey(key, a.node.value);
  });

  return !found;
}

function _containsDependentKey(key, value) {
  const regex = new RegExp(`${SERVICE_PROPERTY_NAME}\.\{(.*)\}`);
  let matches = value.match(regex);

  return (matches && matches[1] && matches[1].split(',').map(s => s.trim()).includes(key)) ||
    value === `${SERVICE_PROPERTY_NAME}.${key}`;
}

function _build(key, t) {
  return t.callExpression(t.memberExpression(t.identifier(SERVICE_VARIABLE_NAME), t.identifier('get')), [t.stringLiteral(key)]);
}
