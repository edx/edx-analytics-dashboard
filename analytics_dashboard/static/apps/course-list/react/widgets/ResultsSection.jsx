import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import DownloadCsvButton from 'course-list/react/components/controls/DownloadCsvButton';
import CourseTable from 'course-list/react/components/results/CourseTable';
import ResultCount from 'course-list/react/components/results/ResultCount';
import TablePagination from 'course-list/react/components/results/TablePagination';
import EmptyState from 'course-list/react/components/status/EmptyState';
import LoadingState from 'course-list/react/components/status/LoadingState';
import { selectStatus } from 'course-list/react/state/courses-slice';
import { pageChanged, selectQuery, sortChanged } from 'course-list/react/state/query-slice';
import {
  selectAvailableColumns, selectCurrentPage, selectPageCount, selectPageRows, selectResultCount,
} from 'course-list/react/state/selectors';

// The same messages as the legacy course list (course-list/list/views/results.js).
const NO_DATA_MESSAGE = 'No course data is currently available for your course.';
const NO_DATA_DETAIL = 'No courses are enrolled, or course activity data has not yet been processed. '
  + 'Data is updated every day, so check back regularly for up-to-date metrics.';
const NO_MATCH_MESSAGE = 'No courses matched your criteria.';

/**
 * The results: a toolbar row (the count, and Download CSV when the server sent its URL), then the course table and its
 * pager, or a message when the search and filters match nothing. The table shows the columns of the columns registry
 * that exist for this page (the waffle switches decide some of them). Sorting and paging are stored in the query; the
 * callbacks are for analytics.
 */
export default function ResultsSection({
  downloadUrl, onDownload, passingUsersEnabled, filtersEnabled, onCourseOpen, onSort, onPage,
}) {
  const dispatch = useDispatch();
  const switches = useMemo(() => ({ passingUsersEnabled, filtersEnabled }), [passingUsersEnabled, filtersEnabled]);
  const status = useSelector(selectStatus);
  const count = useSelector(selectResultCount);
  const rows = useSelector(selectPageRows);
  const available = useSelector(state => selectAvailableColumns(state, switches));
  // The columns shown until the user changes them (the Columns menu comes next): Total Engagements and Engagement
  // Rate start hidden, as in the prototype.
  const columns = useMemo(() => available.filter(column => column.defaultVisible !== false), [available]);
  const { search, filters, sort } = useSelector(selectQuery);
  const page = useSelector(selectCurrentPage);
  const pageCount = useSelector(selectPageCount);
  const changeSort = useCallback((key, dir) => {
    dispatch(sortChanged({ key, dir }));
    onSort(key, dir);
  }, [dispatch, onSort]);
  const changePage = useCallback((target) => {
    dispatch(pageChanged(target));
    onPage(target);
  }, [dispatch, onPage]);

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

  const suggestions = [
    search.trim() ? 'Try a different search.' : '',
    Object.keys(filters).length ? 'Try clearing the filters.' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <div className="insights-results-toolbar">
        <ResultCount count={count} />
        <div className="insights-results-actions">
          {downloadUrl && <DownloadCsvButton url={downloadUrl} onClick={onDownload} />}
        </div>
      </div>
      {count ? (
        <>
          <CourseTable
            columns={columns}
            rows={rows}
            sort={sort}
            onSortChange={changeSort}
            onCourseOpen={onCourseOpen}
          />
          <TablePagination page={page} pageCount={pageCount} onPageChange={changePage} />
        </>
      ) : <EmptyState message={NO_MATCH_MESSAGE} detail={suggestions} />}
    </>
  );
}

ResultsSection.propTypes = {
  downloadUrl: PropTypes.string,
  onDownload: PropTypes.func,
  // The enable_course_passing and enable_course_filters waffle switches, which decide some columns.
  passingUsersEnabled: PropTypes.bool,
  filtersEnabled: PropTypes.bool,
  // Called with the row of the course whose link is clicked.
  onCourseOpen: PropTypes.func,
  // Called with (column id, 'asc' | 'desc') after a sort, and with the 1-based page after a page change.
  onSort: PropTypes.func,
  onPage: PropTypes.func,
};

ResultsSection.defaultProps = {
  downloadUrl: '',
  onDownload: () => {},
  passingUsersEnabled: false,
  filtersEnabled: false,
  onCourseOpen: () => {},
  onSort: () => {},
  onPage: () => {},
};
