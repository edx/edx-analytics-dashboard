import { reportFallbackActivated, reportWidgetFailure } from 'components/react/monitoring';
import { enableReactDebugIfRequested, markFallback } from 'components/react/react-debug';

/**
 * Loads the course list's React widgets when the enable_react_course_list waffle flag is on.
 *
 * The flag is evaluated on the server (CourseIndex.get_context_data) and reaches the browser in the page
 * data (initModelData.course → courseModel). When it is off, the React chunk is never requested.
 * If loading or starting fails, the server-rendered markup stays exactly as it is.
 *
 * Must not import React, Redux or anything under course-list/react/ statically. monitoring.js and
 * react-debug.js import nothing, so they're allowed.
 *
 * @param {Backbone.Model} courseModel - The page model built from initModelData.course.
 * @param {Object} [options]
 * @param {Backbone.Model} [options.trackingModel] - Sends analytics events; passed to the React widgets.
 * @param {Function} [options.importWidgets] - Loads the React chunk; replaced in tests.
 * @returns {Promise<boolean>} Resolves to true when the React widgets were started.
 */
export default function loadReactWidgets(courseModel, {
  trackingModel,
  importWidgets = () => import('apps/course-list/react/index'),
} = {}) {
  if (!courseModel.get('enable_react_course_list')) {
    return Promise.resolve(false);
  }
  // Here too, not only in mountReact, so the debug outline also shows when the React chunk fails to load.
  enableReactDebugIfRequested();

  const keepServerMarkup = (failureType, error) => {
    // Shows "Fallback: <widget>" on every React mount point in debug mode (?react_debug=1).
    Array.prototype.forEach.call(document.querySelectorAll('[data-react-widget]'), (element) => {
      markFallback(element);
    });
    reportWidgetFailure({
      widget: 'course-list', failureType, recovery: 'server_html', error,
    });
    reportFallbackActivated({ widget: 'course-list', fallback: 'server_html', failureType });
    return false;
  };

  return importWidgets().then(
    ({ default: startReactWidgets }) => {
      try {
        startReactWidgets({ courseModel, trackingModel });
        return true;
      } catch (error) {
        return keepServerMarkup('start_error', error);
      }
    },
    error => keepServerMarkup('chunk_load', error),
  );
}
