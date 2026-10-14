// Babel settings that let webpack 3 build Paragon. Shared by webpack.config.js, webpack.prod.config.js and
// karma.conf.js, so the three builds treat Paragon the same way.
const path = require('path');

const { TRANSPILED_PACKAGES_PATTERN } = require('./transpiled-packages');

const IMPORTS_PLUGIN = path.join(__dirname, 'babel-plugin-paragon-imports.js');
const paragonDir = () => path.dirname(require.resolve('@openedx/paragon/package.json'));

/**
 * Babel plugin entry that rewrites Paragon imports into per-file imports (see the plugin for why).
 * @param {boolean} components - Also rewrite `import { Card } from '@openedx/paragon'`. Application code needs
 *   it; Paragon's own files never import their own index.
 */
const paragonImportsPlugin = components => [IMPORTS_PLUGIN, { paragonDir: paragonDir(), components }];

/**
 * webpack rule that transpiles Paragon and its ES2015+ dependencies to ES5. Insights' UglifyJS only accepts
 * ES5, and the Babel rule for application code skips node_modules.
 */
const transpiledPackagesRule = () => ({
  test: /\.m?js$/,
  include: TRANSPILED_PACKAGES_PATTERN,
  use: {
    loader: 'babel-loader',
    options: {
      babelrc: false,
      configFile: false,
      // Some of these packages are ES modules and some are CommonJS.
      sourceType: 'unambiguous',
      presets: [
        ['@babel/preset-env', {
          targets: {
            browsers: ['last 2 versions', 'ie >= 11'],
          },
        }],
      ],
      plugins: ['@babel/plugin-transform-runtime', paragonImportsPlugin(false)],
    },
  },
});

module.exports = { paragonImportsPlugin, transpiledPackagesRule };
