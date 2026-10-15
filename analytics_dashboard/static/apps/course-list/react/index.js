import mountReact from 'components/react/mount-react';
import { reportWidgetFailure } from 'components/react/monitoring';
import ParagonProvider from 'components/react/paragon/ParagonProvider';
import createCourseListStore from 'course-list/react/state/store';
import connectPageModelToStore from 'course-list/react/platform/page-model-bridge';
import CourseListPage from 'course-list/react/widgets/CourseListPage';

const reportSectionFailure = (name, error) => reportWidgetFailure({
  widget: name, failureType: 'render_error', recovery: 'error_state', error,
});

/**
 * Entry point of the course list React chunk. Loaded only by course-list/app/react-loader.js, and only
 * when the enable_react_course_list waffle flag is on, in which case courses/templates/courses/index.html renders
 * #course-list-react-root instead of the legacy course list.
 *
 * Creates the store, fills it from the page model, and mounts the page.
 */
export default function startReactPage({ courseModel }) {
  const element = document.getElementById('course-list-react-root');
  if (!element) {
    throw new Error('startReactPage: #course-list-react-root is missing.');
  }
  const store = createCourseListStore();
  connectPageModelToStore(courseModel, store);
  mountReact(element, CourseListPage, {
    store,
    wrapper: ParagonProvider,
    name: 'course-list',
    props: { onSectionError: reportSectionFailure },
  });
  return store;
}
