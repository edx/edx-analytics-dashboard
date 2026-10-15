import { useSelector } from 'react-redux';

import EmptyState from 'course-list/react/components/status/EmptyState';
import LoadingState from 'course-list/react/components/status/LoadingState';
import { selectStatus } from 'course-list/react/state/selectors';

// The same messages as the legacy course list shows when it has no course data (course-list/list/views/results.js).
const NO_DATA_MESSAGE = 'No course data is currently available for your course.';
const NO_DATA_DETAIL = 'No courses are enrolled, or course activity data has not yet been processed. '
  + 'Data is updated every day, so check back regularly for up-to-date metrics.';

/** The result count, the course table and its pagination. Placeholder for now: only the page states exist. */
export default function ResultsSection() {
  const status = useSelector(selectStatus);
  if (status === 'loading') {
    return <LoadingState />;
  }
  if (status === 'unavailable') {
    return <EmptyState message={NO_DATA_MESSAGE} detail={NO_DATA_DETAIL} />;
  }
  if (status === 'error') {
    // The course data is malformed. Throwing lets this section's boundary show the error state.
    throw new Error('Course data is not valid.');
  }
  return <div className="insights-placeholder">Result count, table and pagination go here.</div>;
}
