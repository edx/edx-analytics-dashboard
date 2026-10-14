import { reportFallbackActivated, reportWidgetFailure } from 'components/react/monitoring';
import { markFallback } from 'components/react/widget-markers';

/**
 * Loads the course list's React widgets when the enable_react_course_list waffle flag is on.
 *
 * The flag is evaluated on the server (CourseIndex.get_context_data) and reaches the browser in the page
 * data (initModelData.course → courseModel). When it is off, the React chunk is never requested.
 * If loading or starting fails, the server-rendered markup stays exactly as it is.
 *
 * Must not import React, Redux or anything under course-list/react/ statically. monitoring.js and
 * widget-markers.js import nothing, so they're allowed.
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

  const keepServerMarkup = (failureType, error) => {
    // Marks every React mount point as showing the server HTML.
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
