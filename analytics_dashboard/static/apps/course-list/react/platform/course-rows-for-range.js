import $ from 'jquery';

import { reportWidgetFailure } from 'components/react/monitoring';
import { normalizeCourseRows } from 'course-list/react/platform/course-rows';
import { encodeParams, timeframeParams } from 'course-list/react/platform/url-state';
import {
  acceptValidRows, coursesFailed, coursesLoaded, coursesLoading, coursesUnavailable,
} from 'course-list/react/state/courses-slice';

// The Timeframe's ranges of a fixed number of days (components/controls/TimeframeDropdown.jsx).
const PRESETS = ['7d', '30d', '60d'];

/**
 * Whether a timeframe has other numbers than All Time: a range of days, or Custom with both its dates (with one, the
 * server shows All Time, and so does the page).
 */
export function isRange({ range, from, to }) {
  return PRESETS.indexOf(range) !== -1 || (range === 'custom' && Boolean(from) && Boolean(to));
}

/** The query string that asks the server for the rows of a timeframe; '' for All Time. */
export function rangeQuery(timeframe) {
  return isRange(timeframe) ? encodeParams(timeframeParams({ timeframe })) : '';
}

const reportFailure = failureType => reportWidgetFailure({
  widget: 'course-list', failureType, recovery: 'error_state',
});

/**
 * Makes the course rows follow the Timeframe. The page data has the rows of All Time; for another range, the numbers
 * come from daily data that only the server has, so the rows are fetched from `rowsUrl` (the server's CourseIndexJSON,
 * course_list_rows_url in the page data) with the range, in the address's format. The table, the summary cards and the
 * filters read the stored rows, so they follow.
 *
 * While the rows load, the courses are 'loading'. An answer to a range the user has since left is ignored. A failed
 * request, or an answer that isn't a list of rows, shows the error message and is reported; an empty list is the "no
 * course data" message, as on the page. Back on All Time, the page's own rows are shown again (`showPageRows`).
 * A timeframe in the page's address when this starts is fetched at once.
 *
 * @param {Object} store - The course list store.
 * @param {Object} options - rowsUrl; showPageRows: a function that puts the page data's rows back in the store;
 *   ajax: jQuery's, for tests.
 * @returns {Function} Stops following the Timeframe.
 */
export default function connectRangeRowsToStore(store, { rowsUrl, showPageRows, ajax = $.ajax }) {
  // The query of the rows shown ('' for the page's own rows), and a number for each request, so an older answer can
  // be told apart.
  let shownQuery = '';
  let requestNumber = 0;

  const load = (query) => {
    requestNumber += 1;
    const number = requestNumber;
    shownQuery = query;
    if (!query) {
      showPageRows();
      return;
    }
    store.dispatch(coursesLoading());
    ajax({
      url: `${rowsUrl}${rowsUrl.indexOf('?') === -1 ? '?' : '&'}${query}`,
      dataType: 'json',
    }).done((data) => {
      if (number !== requestNumber) {
        return;
      }
      const rawRows = data && data.course_list_json;
      if (!Array.isArray(rawRows)) {
        reportFailure('invalid_update');
        store.dispatch(coursesFailed());
        return;
      }
      if (!rawRows.length) {
        store.dispatch(coursesUnavailable());
        return;
      }
      const { programs } = store.getState().courses;
      const { rows, rejectedCount } = acceptValidRows(rawRows);
      if (rejectedCount) {
        reportWidgetFailure({ widget: 'course-list', failureType: 'invalid_update', recovery: 'dropped_invalid_rows' });
      }
      store.dispatch(coursesLoaded({ rows: normalizeCourseRows(rows, programs), programs }));
    }).fail(() => {
      if (number !== requestNumber) {
        return;
      }
      reportFailure('fetch_error');
      store.dispatch(coursesFailed());
    });
  };

  const onStoreChange = () => {
    const query = rangeQuery(store.getState().query.timeframe);
    if (query !== shownQuery) {
      load(query);
    }
  };

  const unsubscribe = store.subscribe(onStoreChange);
  onStoreChange();
  return () => {
    // An answer that comes after this is ignored.
    requestNumber += 1;
    unsubscribe();
  };
}
