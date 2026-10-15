import { reportWidgetFailure } from 'components/react/monitoring';

const ROOT_ID = 'course-list-react-root';
// Plain DOM, because React isn't available when this is needed. Bootstrap 3's alert classes are on every page.
const LOAD_ERROR_HTML = '<div class="alert alert-danger" role="alert">'
  + 'Something went wrong loading this page. <a href="">Reload the page</a>.</div>';

/**
 * Loads the React course list page when the enable_react_course_list waffle flag is on.
 *
 * The flag is evaluated on the server (CourseIndex.get_context_data) and reaches the browser in the page
 * data (initModelData.course → courseModel). When it is on, the template renders only #course-list-react-root
 * (a spinner) and the Backbone course list is not started (course-list-main.js). When it is off, the React
 * chunk is never requested.
 * If loading or starting fails, the spinner is replaced by an error message and the failure is reported.
 * There is no fallback to the legacy page: the legacy UI isn't rendered when the flag is on.
 *
 * Must not import React, Redux or anything under course-list/react/ statically. monitoring.js imports nothing,
 * so it's allowed.
 *
 * @param {Backbone.Model} courseModel - The page model built from initModelData.course.
 * @param {Function} [importPage] - Loads the React chunk; replaced in tests.
 * @returns {Promise<boolean>} Resolves to true when the React page was started.
 */
export default function loadReactPage(
  courseModel,
  importPage = () => import('apps/course-list/react/index'),
) {
  if (!courseModel.get('enable_react_course_list')) {
    return Promise.resolve(false);
  }

  const showLoadError = (failureType, error) => {
    const root = document.getElementById(ROOT_ID);
    if (root) {
      root.innerHTML = LOAD_ERROR_HTML;
    }
    reportWidgetFailure({
      widget: 'course-list', failureType, recovery: 'error_state', error,
    });
    return false;
  };

  return importPage().then(
    ({ default: startReactPage }) => {
      try {
        startReactPage({ courseModel });
        return true;
      } catch (error) {
        return showLoadError('start_error', error);
      }
    },
    error => showLoadError('chunk_load', error),
  );
}
