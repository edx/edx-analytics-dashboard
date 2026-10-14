import { version as reactVersion } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import $ from 'jquery';

import WidgetErrorBoundary from 'components/react/widget-error-boundary';
import { reportFallbackActivated, reportWidgetFailure } from 'components/react/monitoring';
import { enableReactDebugIfRequested, markFallback, markRendered } from 'components/react/react-debug';

/**
 * Renders a React component into an existing element and returns a function that unmounts it.
 * Modeled on edx-platform's common/static/js/src/ReactRenderer.jsx, updated for React 18 (createRoot).
 *
 * Fallback: if the component throws while rendering, the root is unmounted and the element gets back the
 * HTML that was on screen just before. That is the server-rendered HTML if React never rendered
 * successfully, otherwise the last successful React output. The HTML is written directly into the element
 * (no wrapper element) and its Bootstrap tooltips are re-activated. Nothing about the error is shown to users.
 *
 * The element gets data-react-rendered="<widget>" after the first successful render, or
 * data-react-fallback="<widget>" when the fallback is shown. ?react_debug=1 outlines them (react-debug.js).
 *
 * @param {Element} element - Element to render into. Its existing content is the initial fallback.
 * @param {Function} Component - React component to render.
 * @param {Object} [options]
 * @param {Object} [options.store] - Redux store; when given, the component is wrapped in <Provider>.
 * @param {Object} [options.props] - Props passed to the component.
 * @param {string} [options.name] - Widget name for monitoring; defaults to the element's data-react-widget.
 * @returns {Function} Call to unmount the component. The element gets its original server-rendered HTML back.
 */
export default function mountReact(element, Component, { store, props = {}, name } = {}) {
  if (!element) {
    throw new Error(`mountReact: no element to render ${Component.name || 'the component'} into.`);
  }
  const widget = name || element.getAttribute('data-react-widget') || 'unknown';
  const serverHtml = element.innerHTML;
  enableReactDebugIfRequested();
  const root = createRoot(element);
  let mounted = true;

  const onRendered = () => {
    if (mounted) {
      markRendered(element, widget);
    }
  };

  const restore = (lastRenderedHtml, error) => {
    const fallback = lastRenderedHtml ? 'last_rendered' : 'server_html';
    // Runs after React's commit and before the browser paints, outside React's render cycle.
    Promise.resolve().then(() => {
      if (!mounted) {
        return;
      }
      mounted = false;
      root.unmount();
      markFallback(element, widget);
      // eslint-disable-next-line no-param-reassign
      element.innerHTML = lastRenderedHtml || serverHtml;
      if ($.fn.tooltip) {
        $(element).find('.has-tooltip').tooltip();
      }
      reportWidgetFailure({
        widget, failureType: 'render_error', recovery: fallback, error, libraryVersion: reactVersion,
      });
      reportFallbackActivated({ widget, fallback, failureType: 'render_error' });
    });
  };

  const tree = <Component {...props} />;
  root.render(
    <WidgetErrorBoundary container={element} onFallback={restore} onRendered={onRendered}>
      {store ? <Provider store={store}>{tree}</Provider> : tree}
    </WidgetErrorBoundary>,
  );

  return () => {
    if (mounted) {
      mounted = false;
      root.unmount();
      element.removeAttribute('data-react-rendered');
      // The server-rendered version is always the fallback, so give it back, with its tooltips.
      // eslint-disable-next-line no-param-reassign
      element.innerHTML = serverHtml;
      if ($.fn.tooltip) {
        $(element).find('.has-tooltip').tooltip();
      }
    }
  };
}
