/**
 * On-demand debug outline for React widgets.
 *
 * mountReact marks every widget's mount element: data-react-rendered="<widget>" after a successful render,
 * or data-react-fallback="<widget>" when the server-rendered HTML was kept. The attributes are always set
 * and invisible on their own. Opening a page with ?react_debug=1 remembers "on" in this browser's
 * localStorage, and from then on a stylesheet outlines the marked elements (blue: React, red: fallback).
 * ?react_debug=0 turns it off. Nothing is sent anywhere, and other users are unaffected.
 *
 * Imports nothing, so legacy code (course-list/app/react-loader.js) may import it, like monitoring.js.
 */

const STORAGE_KEY = 'insights.reactDebug';
// A regular expression instead of URLSearchParams, which PhantomJS (Karma) doesn't have.
const PARAM_PATTERN = /[?&]react_debug=([01])(?:&|$)/;
const STYLE_ID = 'insights-react-debug-styles';

// outline (not border) takes no space, so nothing moves. The labels never block clicks.
const STYLES = `
[data-react-rendered], [data-react-fallback] { position: relative; outline-offset: 2px; }
[data-react-rendered] { outline: 2px dashed #0075b4; }
[data-react-fallback] { outline: 2px dashed #c32d3a; }
[data-react-rendered]::after, [data-react-fallback]::after {
  position: absolute; top: -9px; left: 8px; z-index: 10; pointer-events: none;
  padding: 0 6px; border-radius: 8px; color: #fff; font: 600 11px/16px sans-serif;
}
[data-react-rendered]::after { content: "React: " attr(data-react-rendered); background: #0075b4; }
[data-react-fallback]::after { content: "Fallback: " attr(data-react-fallback); background: #c32d3a; }
`;

let checked = false;

/**
 * Applies ?react_debug=1 or ?react_debug=0 from the query string to localStorage, and returns whether
 * debug is on. Any storage error (e.g. private browsing) means "off".
 */
export function isReactDebugEnabled(search = window.location.search) {
  try {
    const storage = window.localStorage;
    const match = PARAM_PATTERN.exec(search);
    if (match && match[1] === '1') {
      storage.setItem(STORAGE_KEY, '1');
    } else if (match && match[1] === '0') {
      storage.removeItem(STORAGE_KEY);
    }
    return storage.getItem(STORAGE_KEY) === '1';
  } catch (error) {
    return false;
  }
}

/** Adds the debug outline stylesheet once per page, and only when debug is on. */
export function enableReactDebugIfRequested(search) {
  if (checked) {
    return;
  }
  checked = true;
  if (!isReactDebugEnabled(search) || document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}

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

export function resetReactDebugForTests() {
  checked = false;
  const style = document.getElementById(STYLE_ID);
  if (style) {
    style.parentNode.removeChild(style);
  }
}
