// Replaces @openedx/paragon/styles/scss/core/_exports.module.scss in the webpack build, through the
// NormalModuleReplacementPlugin in webpack.common.config.js and karma.conf.js. Paragon's JavaScript imports that
// SCSS file only to read the grid breakpoints, and Insights' webpack 3 can't import SCSS as a module.
// Same values as $grid-breakpoints in Paragon's _exports.module.scss.
module.exports = {
  xs: '0',
  sm: '576px',
  md: '768px',
  lg: '992px',
  xl: '1200px',
  xxl: '1400px',
};
