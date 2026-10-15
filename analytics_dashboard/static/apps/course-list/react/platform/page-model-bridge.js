import { reportWidgetFailure } from 'components/react/monitoring';
import {
  acceptValidRows, coursesFailed, coursesLoaded, coursesUnavailable,
} from 'course-list/react/state/courses-slice';
import { summaryTextLoaded } from 'course-list/react/state/summary-slice';
import { normalizeCourseRows } from 'course-list/react/platform/course-rows';

const isMissing = value => value === undefined || value === null;
const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);

const reportInvalidData = recovery => reportWidgetFailure({
  widget: 'course-list', failureType: 'invalid_update', recovery,
});

/**
 * One-way sync from the page model (initModelData.course, see load/init-models.js) to the Redux store:
 * course_list_json (the course runs), programs_json (only sent when course filters are enabled) and
 * summary_text (the label and tooltip of each summary card). The summary numbers (`summary`) are not read: the
 * cards are computed from the rows.
 *  - course_list_json missing or an empty list (the server sends [] when there is no course data): the status is
 *    'unavailable' (the legacy page shows its "no course data" message then);
 *  - malformed data: the status is 'error' and the failure is reported;
 *  - rows without a course_id are dropped and reported.
 * Returns a function that stops the syncing.
 */
export default function connectPageModelToStore(courseModel, store) {
  const events = 'change:course_list_json change:programs_json change:summary_text';
  const sync = () => {
    // Text that is missing or not an object leaves the cards without text, which their section reports.
    const summaryText = courseModel.get('summary_text');
    store.dispatch(summaryTextLoaded(isObject(summaryText) ? summaryText : {}));
    const rawRows = courseModel.get('course_list_json');
    const rawPrograms = courseModel.get('programs_json');
    if (isMissing(rawRows) || (Array.isArray(rawRows) && rawRows.length === 0)) {
      store.dispatch(coursesUnavailable());
      return;
    }
    if (!Array.isArray(rawRows) || !(isMissing(rawPrograms) || Array.isArray(rawPrograms))) {
      reportInvalidData('error_state');
      store.dispatch(coursesFailed());
      return;
    }
    const programs = isMissing(rawPrograms) ? [] : rawPrograms;
    const { rows, rejectedCount } = acceptValidRows(rawRows);
    if (rejectedCount) {
      reportInvalidData('dropped_invalid_rows');
    }
    store.dispatch(coursesLoaded({ rows: normalizeCourseRows(rows, programs), programs }));
  };
  courseModel.on(events, sync);
  sync();
  return () => courseModel.off(events, sync);
}
