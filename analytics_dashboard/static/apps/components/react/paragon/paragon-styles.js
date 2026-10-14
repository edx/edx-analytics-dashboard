// Webpack entry for the styles of Paragon widgets. The page template links the resulting CSS file only when the
// enable_react_course_list flag is on (courses/index.html), so pages without Paragon widgets don't load it.
// webpack/paragon/paragon-css-loader.js scopes all three files under .paragon-styles, so they can't affect
// the rest of the page. The theme comes last, so its overrides win.
import '@openedx/paragon/dist/core.min.css';
import '@openedx/paragon/dist/light.min.css';
import 'components/react/paragon/insights-theme.css';
