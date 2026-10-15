/**
 * The cards of the Performance summary, in the order they are shown. Adding a card means adding one entry here.
 *
 *   id:      unique; also the key of the card's analytics event
 *   textKey: the key of its label and tooltip in the page data's `summary_text`
 *   reduce:  (rows) => number; computed from the rows that match the filters. For the unfiltered list it must
 *            equal the server's CourseSummariesPresenter.get_course_summary_metrics.
 */
export default [];
