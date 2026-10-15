import { reportWidgetFailure } from 'components/react/monitoring';
import {
  acceptValidRows, coursesFailed, coursesLoaded, coursesUnavailable,
} from 'course-list/react/state/courses-slice';

const isMissing = value => value === undefined || value === null;

const reportInvalidData = recovery => reportWidgetFailure({
  widget: 'course-list', failureType: 'invalid_update', recovery,
});

/**
 * One-way sync from the page model (initModelData.course, see load/init-models.js) to the Redux store:
 * course_list_json (the course runs) and programs_json (only sent when course filters are enabled).
 *  - course_list_json missing: the server couldn't load the course data, so the status is 'unavailable'
 *    (the legacy page shows its "no course data" message then);
 *  - malformed data: the status is 'error' and the failure is reported;
 *  - rows without a course_id are dropped and reported.
 * Returns a function that stops the syncing.
 */
export default function connectPageModelToStore(courseModel, store) {
  const events = 'change:course_list_json change:programs_json';
  const sync = () => {
    const rawRows = courseModel.get('course_list_json');
    const rawPrograms = courseModel.get('programs_json');
    if (isMissing(rawRows)) {
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
    store.dispatch(coursesLoaded({ rows, programs }));
  };
  courseModel.on(events, sync);
  sync();
  return () => courseModel.off(events, sync);
}
