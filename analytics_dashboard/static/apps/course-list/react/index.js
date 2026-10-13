import mountReact from 'components/react/mount-react';
import createCourseListStore from 'course-list/react/state/store';
import connectPageModelToStore from 'course-list/react/platform/page-model-bridge';
// TEMPORARY: mounts the card with a "Loaded from React" badge for manual testing. Revert before merging.
import TotalEnrollmentWidget from 'course-list/react/widgets/TotalEnrollmentWithReactBadge';

/**
 * Entry point of the course list React chunk. Loaded only by course-list/app/react-loader.js, and only
 * when the enable_react_course_list waffle flag is on.
 */
export default function startReactWidgets({ courseModel }) {
  const store = createCourseListStore();
  connectPageModelToStore(courseModel, store);

  const totalEnrollment = document.querySelector('[data-react-widget="total-enrollment"]');
  if (totalEnrollment) {
    mountReact(totalEnrollment, TotalEnrollmentWidget, { store });
  }
  return store;
}
