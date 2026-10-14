// webpack loader: scopes Paragon's CSS under .paragon-styles (see scope-paragon-css.js). It runs before css-loader.
const fs = require('fs');

const { scopeParagonCss } = require('./scope-paragon-css');

let customMediaCss;
function readCustomMedia() {
  if (customMediaCss === undefined) {
    customMediaCss = fs.readFileSync(
      require.resolve('@openedx/paragon/styles/css/core/custom-media-breakpoints.css'),
      'utf8',
    );
  }
  return customMediaCss;
}

module.exports = function paragonCssLoader(source) {
  if (this.cacheable) {
    this.cacheable();
  }
  return scopeParagonCss(source, readCustomMedia());
};
