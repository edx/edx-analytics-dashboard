import { toNumber } from 'course-list/react/state/values';

const sumOf = (rows, read) => rows.reduce((sum, row) => sum + read(row), 0);

/**
 * The cards of the Performance summary, in the order they are shown. Adding a card means adding one entry here and
 * its label and tooltip to the page data's `summary_text` (CourseIndex.get_context_data).
 *
 *   id:      unique; names the card's tooltip
 *   textKey: the key of its label and tooltip in `summary_text`. If the server sends no text for it, the whole
 *            summary section shows the error state, so add the text in the same change.
 *   reduce:  (rows) => number; computed from the course rows. The rows are the normalized ones
 *            (platform/course-rows.js): a field that is not normalized there, such as enrollment_modes.masters, may be
 *            missing, so read it safely or normalize it. For the whole list the number must equal the server's
 *            CourseSummariesPresenter.get_course_summary_metrics (the fixture's `expected_summary`).
 *            The rows are the ones that match the search and the filters.
 *   pending: true for a card whose data the server may not send yet, with `field` the row field it reads. While no
 *            row has the field, the card shows "--", and it is listed only if SHOW_PENDING_COLUMNS
 *            (registries/columns.js) is true; with data it always shows the number. The field must stay absent when
 *            there is no data (platform/course-rows.js never fills it with 0).
 */
export default [
  {
    id: 'totalEnrollment',
    textKey: 'total_enrollment',
    // The sum of every course run's all-time enrollment.
    reduce: rows => sumOf(rows, row => row.cumulative_count),
  },
  {
    id: 'currentEnrollment',
    textKey: 'current_enrollment',
    reduce: rows => sumOf(rows, row => row.count),
  },
  // No data or ticket yet: the same open metric as the Total Engagements column.
  {
    id: 'totalEngagements',
    textKey: 'total_engagements',
    pending: true,
    field: 'total_engagements',
    reduce: rows => sumOf(rows, row => toNumber(row.total_engagements) || 0),
  },
  {
    id: 'enrollmentChange',
    textKey: 'enrollment_change_7_days',
    reduce: rows => sumOf(rows, row => row.count_change_7_days),
  },
  {
    id: 'verifiedEnrollment',
    textKey: 'verified_enrollment',
    // course-rows.js copies it out of enrollment_modes.verified.
    reduce: rows => sumOf(rows, row => row.verified_enrollment),
  },
  {
    id: 'mastersEnrollment',
    textKey: 'masters_enrollment',
    // Not normalized: a course without Master's learners has no enrollment_modes.masters.
    reduce: rows => sumOf(rows, (row) => {
      const masters = row.enrollment_modes && row.enrollment_modes.masters;
      return (masters && toNumber(masters.count)) || 0;
    }),
  },
];
