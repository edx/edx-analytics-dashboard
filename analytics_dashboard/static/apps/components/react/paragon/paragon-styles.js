// Webpack entry for the styles of Paragon widgets. A page that has Paragon widgets must link the resulting CSS file
// (and, in development, this entry's JS bundle) in its template, so pages without Paragon widgets don't load it.
// No page does yet.
// webpack/paragon/paragon-css-loader.js scopes all three files under .paragon-styles, so they can't affect
// the rest of the page. The theme comes last, so its overrides win.
import '@openedx/paragon/dist/core.min.css';
import '@openedx/paragon/dist/light.min.css';
import 'components/react/paragon/insights-theme.css';
