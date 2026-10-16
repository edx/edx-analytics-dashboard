import { reportWidgetFailure } from 'components/react/monitoring';

const ROOT_ID = 'course-list-react-root';
// The markup of Insights' error alert (templates/section_error.html), as plain HTML because React isn't
// available when this is needed.
const LOAD_ERROR_HTML = '<div class="alert alert-error" role="alert" aria-labelledby="alert-error-title" tabindex="-1">'
  + '<span class="icon alert-icon fa fa-warning" aria-hidden="true"></span>'
  + '<div class="alert-message">'
  + '<h3 class="alert-title" id="alert-error-title">We are unable to load this page.</h3>'
  + '<p class="alert-copy-with-title">Reload the page to try again.</p>'
  + '</div></div>';

/**
 * Replaces the spinner in #course-list-react-root with the error alert and reports the failure.
 * Also used by course-list-main.js when the page model can't be loaded.
 */
export function showLoadError(failureType, error) {
  const root = document.getElementById(ROOT_ID);
  if (root) {
    root.innerHTML = LOAD_ERROR_HTML;
  }
  reportWidgetFailure({
    widget: 'course-list', failureType, recovery: 'error_state', error,
  });
  return false;
}

/**
 * Loads the React course list page when the enable_react_course_list waffle flag is on.
 *
 * The flag is evaluated on the server (CourseIndex.get_context_data) and reaches the browser in the page
 * data (initModelData.course → courseModel). When it is on, the template renders only #course-list-react-root
 * (a spinner) and the Backbone course list is not started (course-list-main.js). When it is off, the React
 * chunk is never requested.
 * If loading or starting fails, the spinner is replaced by the error alert and the failure is reported.
 * There is no fallback to the legacy page: the legacy UI isn't rendered when the flag is on.
 *
 * Must not import React, Redux or anything under course-list/react/ statically. monitoring.js imports nothing,
 * so it's allowed.
 *
 * @param {Backbone.Model} courseModel - The page model built from initModelData.course.
 * @param {Object} [options]
 * @param {Backbone.Model} [options.trackingModel] - Sends analytics events; passed to the React page.
 * @param {Function} [options.importPage] - Loads the React chunk; replaced in tests.
 * @returns {Promise<boolean>} Resolves to true when the React page was started.
 */
export default function loadReactPage(courseModel, {
  trackingModel,
  importPage = () => import('apps/course-list/react/index'),
} = {}) {
  if (!courseModel.get('enable_react_course_list')) {
    return Promise.resolve(false);
  }

  return importPage().then(
    ({ default: startReactPage }) => {
      try {
        startReactPage({ courseModel, trackingModel });
        return true;
      } catch (error) {
        return showLoadError('start_error', error);
      }
    },
    error => showLoadError('chunk_load', error),
  );
}
