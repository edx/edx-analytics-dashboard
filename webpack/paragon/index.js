// What the webpack and Karma configs need to build Paragon with Insights' webpack 3 toolchain. Shared by
// webpack.common.config.js, webpack.config.js, webpack.prod.config.js and karma.conf.js, so all builds treat
// Paragon the same way. See the "How Paragon is wired into this page" section of the course list React README.
const path = require('path');

// node_modules packages that ship ES2015+ code and are used by Paragon widgets. They're transpiled to ES5,
// because webpack 3's UglifyJS only accepts ES5, and webpack 3 can't parse some of their syntax at all. When a
// Paragon upgrade makes `npm run build` fail with "from UglifyJs" or "Module parse failed", add the package named
// in the error here.
const TRANSPILED_PACKAGES = [
  '@openedx/paragon',
  '@restart/hooks',
  'detect-node-es',
  'imask',
  'mailto-link',
  'query-string',
  'react-imask',
  'react-loading-skeleton',
  'split-on-first',
  'strict-uri-encode',
  'uuid',
];

// Scoped package names contain "/", but webpack uses "\" in paths on Windows: accept both.
const escapeForRegExp = name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '[\\\\/]');

// Matches any file inside one of the packages, for babel-loader's `include`.
const TRANSPILED_PACKAGES_PATTERN = new RegExp(
  `node_modules[\\\\/](${TRANSPILED_PACKAGES.map(escapeForRegExp).join('|')})[\\\\/]`,
);

// Paragon's prebuilt CSS and Insights' theme overrides for it (see paragon-styles.js). They are scoped under
// .paragon-styles by paragon-css-loader. Paths use "/" or "\" (Windows), so each separator is a character class
// of both. String.raw keeps the backslashes as written, so [\\/] below is the regular expression class that
// matches a backslash or a slash.
const PARAGON_CSS_PATTERN = new RegExp(
  String.raw`node_modules[\\/]@openedx[\\/]paragon[\\/]dist[\\/](core|light)\.min\.css$`
  + String.raw`|apps[\\/]components[\\/]react[\\/]paragon[\\/]insights-theme\.css$`,
);

// Lets webpack configs say `loader: 'paragon-css-loader'` (see resolveLoader.alias in webpack.common.config.js).
const PARAGON_CSS_LOADER = path.join(__dirname, 'paragon-css-loader.js');

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

module.exports = {
  PARAGON_CSS_LOADER,
  PARAGON_CSS_PATTERN,
  TRANSPILED_PACKAGES_PATTERN,
  paragonImportsPlugin,
  transpiledPackagesRule,
};
