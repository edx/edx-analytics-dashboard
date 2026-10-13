// React 18, Redux Toolkit and immer need ES2015 built-ins (Map, Set, Symbol, Promise) that PhantomJS lacks.
// The app gets this polyfill from application-main.js, which is not part of the test bundle.
require('@babel/polyfill');

// Tells React 18 that the tests wrap updates in act().
window.IS_REACT_ACT_ENVIRONMENT = true;

const context = require.context('../../../', true, /.+spec\.jsx?$/);
require('../../load/init-tooltips');

context.keys().forEach(context);
module.exports = context;
