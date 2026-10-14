// node_modules packages that ship ES2015+ code and are used by Paragon widgets. They're transpiled to ES5,
// because webpack 3's UglifyJS only accepts ES5, and webpack 3 can't parse some of their syntax at all.
// Found with scripts/find-non-es5-modules.js; see "Upgrading Paragon" in the course list React README.
const PACKAGES = [
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

module.exports = {
  PACKAGES,
  // Matches any file inside one of the packages, for babel-loader's `include`.
  TRANSPILED_PACKAGES_PATTERN: new RegExp(`node_modules[\\\\/](${PACKAGES.map(escapeForRegExp).join('|')})[\\\\/]`),
};
