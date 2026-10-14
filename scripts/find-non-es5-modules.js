// Lists the node_modules packages in the production build that ship syntax newer than ES5.
// Insights' production build minifies with webpack 3's UglifyJS, which only accepts ES5, so every such package
// must be transpiled: add it to PACKAGES in webpack/paragon/transpiled-packages.js. Run it after upgrading
// Paragon, when `npm run build` fails with "from UglifyJs" or "Module parse failed":
//
//   node scripts/find-non-es5-modules.js
//
// It builds with webpack.prod.config.js minus the minifier, then walks each bundled module's syntax tree.
// import/export statements are ignored, because webpack rewrites them itself.
const acorn = require('acorn');
const webpack = require('webpack');

// process.env.NODE_ENV is set by webpack.prod.config.js.
const config = require('../webpack.prod.config.js');

const MODERN_NODES = new Set([
  'ArrowFunctionExpression', 'ClassDeclaration', 'ClassExpression', 'TemplateLiteral', 'TaggedTemplateExpression',
  'SpreadElement', 'RestElement', 'ObjectPattern', 'ArrayPattern', 'AssignmentPattern', 'ForOfStatement',
  'YieldExpression', 'AwaitExpression', 'MetaProperty', 'ChainExpression', 'ImportExpression',
  'MethodDefinition', 'PropertyDefinition',
]);

function findModernSyntax(node, found) {
  if (!node || typeof node.type !== 'string') {
    return;
  }
  let feature = null;
  if (MODERN_NODES.has(node.type)) {
    feature = node.type;
  } else if (node.type === 'VariableDeclaration' && node.kind !== 'var') {
    feature = node.kind;
  } else if ((node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression')
    && (node.async || node.generator)) {
    feature = node.async ? 'async function' : 'generator';
  } else if (node.type === 'Property' && (node.shorthand || node.method || node.computed)) {
    feature = 'object shorthand or computed key';
  } else if (node.type === 'LogicalExpression' && node.operator === '??') {
    feature = '??';
  } else if (node.type === 'BinaryExpression' && node.operator === '**') {
    feature = '**';
  }
  if (feature) {
    found.add(feature);
  }
  Object.keys(node).forEach((key) => {
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach(child => findModernSyntax(child, found));
    } else if (value && typeof value === 'object') {
      findModernSyntax(value, found);
    }
  });
}

const scanConfig = {
  ...config,
  plugins: config.plugins.filter(plugin => !(plugin instanceof webpack.optimize.UglifyJsPlugin)),
};

webpack(scanConfig, (error, stats) => {
  if (error) {
    throw error;
  }
  const packages = {};
  let checked = 0;
  stats.toJson({ source: true, modules: true }).modules.forEach((module) => {
    if (!module.source || !/node_modules/.test(module.name) || !/\.m?js$/.test(module.name)) {
      return;
    }
    checked += 1;
    const found = new Set();
    try {
      findModernSyntax(acorn.parse(module.source, { ecmaVersion: 'latest', sourceType: 'module' }), found);
    } catch (parseError) {
      found.add(`parse error: ${parseError.message}`);
    }
    if (!found.size) {
      return;
    }
    const name = (module.name.match(/node_modules[\\/]((@[^\\/]+[\\/])?[^\\/]+)/) || [])[1];
    packages[name] = packages[name] || { modules: 0, features: new Set() };
    packages[name].modules += 1;
    found.forEach(feature => packages[name].features.add(feature));
  });

  console.log(`Checked ${checked} node_modules modules.`);
  const names = Object.keys(packages).sort();
  if (!names.length) {
    console.log('Every bundled package is ES5.');
    return;
  }
  console.log('These packages ship newer syntax. Add them to webpack/paragon/transpiled-packages.js:');
  names.forEach((name) => {
    console.log(`  ${name}: ${packages[name].modules} module(s): ${Array.from(packages[name].features).join(', ')}`);
  });
});
