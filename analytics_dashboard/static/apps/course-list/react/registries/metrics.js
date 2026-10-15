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
 */
export default [
  {
    id: 'totalEnrollment',
    textKey: 'total_enrollment',
    // The sum of every course run's all-time enrollment.
    reduce: rows => rows.reduce((sum, row) => sum + row.cumulative_count, 0),
  },
];
