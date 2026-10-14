import mountReact from 'components/react/mount-react';
import ParagonProvider from 'components/react/paragon/ParagonProvider';
import ensureParagonRoots from 'components/react/paragon/portal-roots';
import createCourseListStore from 'course-list/react/state/store';
import connectPageModelToStore from 'course-list/react/platform/page-model-bridge';
import createTooltipTracker from 'course-list/react/platform/tracking';
import SummaryMetricWidget from 'course-list/react/widgets/SummaryMetricWidget';

/**
 * Entry point of the course list React chunk. Loaded only by course-list/app/react-loader.js, and only
 * when the enable_react_course_list waffle flag is on.
 *
 * Every element with data-react-summary-metric="<key>" gets that summary card; the key selects the card's number
 * and text in the store. Elements are marked by courses/templates/courses/index.html.
 */
export default function startReactWidgets({ courseModel, trackingModel }) {
  const store = createCourseListStore();
  connectPageModelToStore(courseModel, store);
  ensureParagonRoots();
  const onTooltipShown = createTooltipTracker(trackingModel);

  // Array.prototype.forEach: NodeList.forEach isn't available in every browser Insights runs tests in.
  Array.prototype.forEach.call(document.querySelectorAll('[data-react-summary-metric]'), (element) => {
    mountReact(element, SummaryMetricWidget, {
      store,
      wrapper: ParagonProvider,
      props: { metric: element.getAttribute('data-react-summary-metric'), onTooltipShown },
    });
  });
  return store;
}
