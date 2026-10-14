// Which CSS files are Paragon's (scoped under .paragon-styles by paragon-css-loader), shared by the webpack configs.
const path = require('path');

// Paragon's prebuilt CSS and Insights' theme overrides for it (see paragon-styles.js). Paths use "/" or "\"
// (Windows), so each separator is a character class of both. String.raw keeps the backslashes as written, so
// [\\/] below is the regular expression class that matches a backslash or a slash.
const PARAGON_CSS_PATTERN = new RegExp(
  String.raw`node_modules[\\/]@openedx[\\/]paragon[\\/]dist[\\/](core|light)\.min\.css$`
  + String.raw`|apps[\\/]components[\\/]react[\\/]paragon[\\/]insights-theme\.css$`,
);

// Lets webpack configs say `loader: 'paragon-css-loader'` (see resolveLoader.alias in webpack.common.config.js).
const PARAGON_CSS_LOADER = path.join(__dirname, 'paragon-css-loader.js');

module.exports = { PARAGON_CSS_PATTERN, PARAGON_CSS_LOADER };
