// React 18, Redux Toolkit and immer need ES2015 built-ins (Map, Set, Symbol, Promise) that PhantomJS lacks.
// The app gets this polyfill from application-main.js, which is not part of the test bundle.
require('@babel/polyfill');

// Tells React 18 that the tests wrap updates in act().
window.IS_REACT_ACT_ENVIRONMENT = true;

// Paragon's Overlay declares PropTypes.instanceOf(EventTarget) when it loads, and PhantomJS has no EventTarget
// global (every browser Insights supports does). Node is the closest thing PhantomJS has; the prop type only
// checks which kind of element an overlay is attached to.
if (typeof window.EventTarget === 'undefined') {
  window.EventTarget = window.Node;
}

// react-intl, which Paragon requires, needs the browser's Intl API (number and date formatting), and PhantomJS
// has none. Every browser Insights supports does, so this polyfill, with English data, is only for the tests.
if (typeof window.Intl === 'undefined') {
  /* eslint-disable global-require */
  require('intl');
  require('intl/locale-data/jsonp/en');
  /* eslint-enable global-require */
}

const context = require.context('../../../', true, /.+spec\.jsx?$/);
require('../../load/init-tooltips');

context.keys().forEach(context);
module.exports = context;
