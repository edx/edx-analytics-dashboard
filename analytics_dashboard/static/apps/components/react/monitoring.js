/**
 * Minimal production monitoring for React widgets, through the page's existing Datadog RUM integration
 * (load/init-datadog-rum.js). Rules:
 *  - at most one event per widget and failure type per page load, and nothing when everything works;
 *  - only the allow-listed context below: never data values, labels, error messages, stacks or HTML;
 *  - does nothing when RUM isn't enabled, and never throws.
 * Imports nothing, so course-list/app/react-loader.js can use it before React is loaded.
 */
const FLAG_NAME = 'enable_react_course_list';

const MESSAGES = {
  chunk_load: 'Insights React widgets failed to load',
  start_error: 'Insights React widgets failed to start',
  render_error: 'Insights React widget failed to render',
  invalid_update: 'Insights React widget received invalid data',
};
const DEFAULT_MESSAGE = 'Insights React widget failed';

let reported = {};

function getRum() {
  const rum = window.DD_RUM;
  return rum && typeof rum.addError === 'function' && typeof rum.addAction === 'function' ? rum : null;
}

function isFirstReport(key) {
  if (reported[key]) {
    return false;
  }
  reported[key] = true;
  return true;
}

function baseContext(widget) {
  return {
    'insights.react.widget': widget,
    'insights.react.flag': FLAG_NAME,
    'insights.react.flag_enabled': true,
  };
}

/**
 * Reports a widget failure as a RUM error with a fixed message.
 *
 * @param {Object} failure
 * @param {string} failure.widget - Widget or area name, e.g. 'total-enrollment'.
 * @param {string} failure.failureType - One of the MESSAGES keys.
 * @param {string} failure.recovery - What the user sees instead: 'server_html', 'last_rendered' or 'kept_last_value'.
 * @param {Error} [failure.error] - Only its class name is sent.
 * @param {string} [failure.libraryVersion] - React version, when React is loaded.
 */
export function reportWidgetFailure({
  widget, failureType, recovery, error, libraryVersion,
}) {
  const message = MESSAGES[failureType] || DEFAULT_MESSAGE;
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error(message, error);
  }
  const rum = getRum();
  if (!rum || !isFirstReport(`${widget}:${failureType}`)) {
    return;
  }
  const context = {
    ...baseContext(widget),
    'insights.react.failure_type': failureType,
    'insights.react.recovery': recovery,
    'insights.react.error_name': (error && error.name) || 'none',
  };
  if (libraryVersion) {
    context['insights.react.library_version'] = libraryVersion;
  }
  try {
    rum.addError(new Error(message), context);
  } catch (ignored) {
    // Monitoring must never affect the page.
  }
}

/**
 * Reports that a widget's fallback was activated (the server HTML was kept or restored, or the last
 * successful render was restored).
 *
 * @param {Object} fallbackEvent
 * @param {string} fallbackEvent.widget - Widget or area name.
 * @param {string} fallbackEvent.fallback - 'server_html' or 'last_rendered'.
 * @param {string} fallbackEvent.failureType - The failure that caused it.
 */
export function reportFallbackActivated({ widget, fallback, failureType }) {
  const rum = getRum();
  if (!rum || !isFirstReport(`${widget}:fallback`)) {
    return;
  }
  try {
    rum.addAction('insights_react_fallback_activated', {
      ...baseContext(widget),
      'insights.react.fallback': fallback,
      'insights.react.failure_type': failureType,
    });
  } catch (ignored) {
    // Monitoring must never affect the page.
  }
}

export function resetMonitoringForTests() {
  reported = {};
}
