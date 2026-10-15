import { useSelector } from 'react-redux';

import SummaryCard from 'course-list/react/components/SummaryCard';
import { selectSummaryText, selectTotalEnrollment } from 'course-list/react/state/summary-slice';

/** The "Total Enrollment" Performance Summary card, connected to the Redux store. */
export default function TotalEnrollmentWidget() {
  const value = useSelector(selectTotalEnrollment);
  const text = useSelector(state => selectSummaryText(state, 'totalEnrollment'));
  if (value === undefined || text === undefined) {
    // No valid data has ever been loaded. Throwing lets the error boundary keep the server-rendered card
    // instead of showing a made-up value. The message is fixed and contains no data.
    throw new Error('Total enrollment data is not available.');
  }
  return <SummaryCard value={value === null ? 0 : value} label={text.label} tooltip={text.tooltip} />;
}
