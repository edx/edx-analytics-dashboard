/**
 * Markers that mountReact puts on a widget's mount element, to see in DevTools what React did:
 * data-react-rendered="<widget>" after a successful render, or data-react-fallback="<widget>" when the
 * server-rendered HTML was kept. They have no visual effect.
 *
 * Imports nothing, so legacy code (course-list/app/react-loader.js) may import it, like monitoring.js.
 */

/** Marks an element whose server-rendered HTML is shown instead of the React widget. */
export function markFallback(element, widget) {
  element.removeAttribute('data-react-rendered');
  element.setAttribute('data-react-fallback', widget || element.getAttribute('data-react-widget') || 'unknown');
}

/** Marks an element that React rendered successfully. */
export function markRendered(element, widget) {
  element.removeAttribute('data-react-fallback');
  element.setAttribute('data-react-rendered', widget);
}
