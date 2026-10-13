import { reportWidgetFailure } from 'components/react/monitoring';
import { acceptValidSummary, summaryLoaded } from 'course-list/react/state/summary-slice';

// Server keys (CourseSummariesPresenter.get_course_summary_metrics) → store keys.
const METRIC_KEYS = {
  total_enrollment: 'totalEnrollment',
  current_enrollment: 'currentEnrollment',
  enrollment_change_7_days: 'enrollmentChange7Days',
  verified_enrollment: 'verifiedEnrollment',
  masters_enrollment: 'mastersEnrollment',
};

export function toSummaryPayload(summary, summaryText) {
  const values = summary || {};
  const texts = summaryText || {};
  const metrics = {};
  const text = {};
  Object.keys(METRIC_KEYS).forEach((serverKey) => {
    if (serverKey in values) {
      metrics[METRIC_KEYS[serverKey]] = values[serverKey];
    }
    if (serverKey in texts) {
      text[METRIC_KEYS[serverKey]] = texts[serverKey];
    }
  });
  return { metrics, text };
}

/**
 * One-way sync from the page model (initModelData.course, see load/init-models.js) to the Redux store.
 * Invalid values are dropped and reported, so the store keeps the last valid ones.
 * Returns a function that stops the syncing.
 */
export default function connectPageModelToStore(courseModel, store) {
  const events = 'change:summary change:summary_text';
  const sync = () => {
    const { accepted, rejectedKeys } = acceptValidSummary(
      toSummaryPayload(courseModel.get('summary'), courseModel.get('summary_text')),
    );
    if (rejectedKeys.length) {
      reportWidgetFailure({ widget: 'summary', failureType: 'invalid_update', recovery: 'kept_last_value' });
    }
    store.dispatch(summaryLoaded(accepted));
  };
  courseModel.on(events, sync);
  sync();
  return () => courseModel.off(events, sync);
}
