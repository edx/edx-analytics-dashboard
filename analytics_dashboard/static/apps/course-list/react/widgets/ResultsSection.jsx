import {
  useCallback, useEffect, useMemo, useRef,
} from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { ViewColumn } from '@openedx/paragon/icons';

import CheckboxDropdown from 'course-list/react/components/controls/CheckboxDropdown';
import DownloadCsvButton from 'course-list/react/components/controls/DownloadCsvButton';
import CourseTable from 'course-list/react/components/results/CourseTable';
import ResultCount from 'course-list/react/components/results/ResultCount';
import TablePagination from 'course-list/react/components/results/TablePagination';
import EmptyState from 'course-list/react/components/status/EmptyState';
import InvalidParametersState from 'course-list/react/components/status/InvalidParametersState';
import LoadingState from 'course-list/react/components/status/LoadingState';
import { selectStatus } from 'course-list/react/state/courses-slice';
import {
  DEFAULT_SORT, pageChanged, selectQuery, sortChanged,
} from 'course-list/react/state/query-slice';
import {
  selectAvailableColumns, selectCurrentPage, selectPageCount, selectPageRows, selectResultCount, selectVisibleColumns,
} from 'course-list/react/state/selectors';
import { columnsChanged, selectUrlInvalid } from 'course-list/react/state/view-slice';

// The same messages as the legacy course list (course-list/list/views/results.js).
const NO_DATA_MESSAGE = 'No course data is currently available for your course.';
const NO_DATA_DETAIL = 'No courses are enrolled, or course activity data has not yet been processed. '
  + 'Data is updated every day, so check back regularly for up-to-date metrics.';
const NO_MATCH_MESSAGE = 'No courses matched your criteria.';

/**
 * The results: a toolbar row (the count; the Columns menu; Download CSV when the server sent its URL), then the course
 * table and its pager, or a message when the search and filters match nothing. The columns of the columns registry
 * that exist for this page (the waffle switches decide some of them) are listed in the Columns menu, except Course
 * Name, which is always shown. Sorting and paging are stored in the query, the chosen columns in the view; the
 * callbacks are for analytics.
 */
export default function ResultsSection({
  downloadUrl, onDownload, passingUsersEnabled, filtersEnabled, onCourseOpen, onSort, onPage, onColumnsChange,
}) {
  const dispatch = useDispatch();
  const switches = useMemo(() => ({ passingUsersEnabled, filtersEnabled }), [passingUsersEnabled, filtersEnabled]);
  const status = useSelector(selectStatus);
  const count = useSelector(selectResultCount);
  const rows = useSelector(selectPageRows);
  const available = useSelector(state => selectAvailableColumns(state, switches));
  const columns = useSelector(state => selectVisibleColumns(state, switches));
  const columnOptions = useMemo(
    () => available.filter(column => !column.alwaysVisible).map(column => ({ value: column.id, label: column.label })),
    [available],
  );
  const shownIds = useMemo(() => columns.filter(column => !column.alwaysVisible).map(column => column.id), [columns]);
  const { search, filters, sort } = useSelector(selectQuery);
  const page = useSelector(selectCurrentPage);
  const pageCount = useSelector(selectPageCount);
  const urlInvalid = useSelector(selectUrlInvalid);
  const table = useRef(null);
  // The table scrolls inside its own box: a new sort or page starts at its top.
  const scrollTableToTop = () => {
    const box = table.current && table.current.querySelector('.insights-table-scroll');
    if (box) {
      box.scrollTop = 0;
    }
  };
  const changeSort = useCallback((key, dir) => {
    dispatch(sortChanged({ key, dir }));
    scrollTableToTop();
    onSort(key, dir);
  }, [dispatch, onSort]);
  // After a pager click, focus moves to the results, as the legacy pager does (the clicked First or Last button becomes
  // disabled, and Paragon moves focus itself after a click). An effect runs after Paragon's own, so this one wins.
  const focusResultsAfterPage = useRef(false);
  useEffect(() => {
    if (focusResultsAfterPage.current) {
      focusResultsAfterPage.current = false;
      if (table.current) {
        table.current.focus();
      }
    }
  }, [page]);
  const changePage = useCallback((target) => {
    focusResultsAfterPage.current = true;
    dispatch(pageChanged(target));
    scrollTableToTop();
    onPage(target);
  }, [dispatch, onPage]);
  const changeColumns = (ids) => {
    // One box changes at a time: report which column was shown or hidden.
    const shown = ids.filter(id => shownIds.indexOf(id) === -1);
    const hidden = shownIds.filter(id => ids.indexOf(id) === -1);
    dispatch(columnsChanged(ids));
    if (hidden.indexOf(sort.key) !== -1) {
      // The rows must not stay in the order of a column that is no longer shown.
      dispatch(sortChanged(DEFAULT_SORT));
    }
    shown.forEach(id => onColumnsChange(id, true));
    hidden.forEach(id => onColumnsChange(id, false));
  };

  const downloadButton = downloadUrl ? <DownloadCsvButton url={downloadUrl} onClick={onDownload} /> : null;
  // While there are no results to show, the Download CSV link stays, on its own in the toolbar.
  const withDownload = state => (downloadButton ? (
    <>
      <div className="insights-results-toolbar">
        <div className="insights-results-actions">{downloadButton}</div>
      </div>
      {state}
    </>
  ) : state);
  if (status === 'loading') {
    return withDownload(<LoadingState />);
  }
  if (status === 'unavailable') {
    return withDownload(<EmptyState message={NO_DATA_MESSAGE} detail={NO_DATA_DETAIL} />);
  }
  if (status === 'error') {
    // The course data is malformed. Throwing lets this section's boundary show the error state.
    throw new Error('Course data is not valid.');
  }

  const hasCriteria = Boolean(search.trim()) || Object.keys(filters).length > 0;
  const suggestions = [
    search.trim() ? 'Try a different search.' : '',
    Object.keys(filters).length ? 'Try clearing the filters.' : '',
  ].filter(Boolean).join(' ');

  let resultsBody;
  if (urlInvalid) {
    // The page's address had a parameter that can't be used: like the legacy page, the message replaces the results.
    resultsBody = <InvalidParametersState />;
  } else if (count) {
    resultsBody = (
      <>
        <div ref={table} tabIndex={-1} className="insights-results-table" role="region" aria-label="Course runs">
          <CourseTable
            columns={columns}
            rows={rows}
            itemCount={count}
            sort={sort}
            onSortChange={changeSort}
            onCourseOpen={onCourseOpen}
          />
        </div>
        <TablePagination page={page} pageCount={pageCount} onPageChange={changePage} />
      </>
    );
  } else if (hasCriteria) {
    resultsBody = <EmptyState message={NO_MATCH_MESSAGE} detail={suggestions} />;
  } else {
    // With no search and no filter, nothing matching means there are no course runs at all (for example the server
    // sent rows without course IDs).
    resultsBody = <EmptyState message={NO_DATA_MESSAGE} detail={NO_DATA_DETAIL} />;
  }

  return (
    <>
      <div className="insights-results-toolbar">
        <ResultCount count={count} />
        <div className="insights-results-actions">
          <CheckboxDropdown
            id="columns"
            label="Columns"
            icon={ViewColumn}
            showCount={false}
            options={columnOptions}
            selected={shownIds}
            onChange={changeColumns}
          />
          {downloadButton}
        </div>
      </div>
      {resultsBody}
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
  // Called with (column id, true when shown / false when hidden) after a change in the Columns menu.
  onColumnsChange: PropTypes.func,
};

ResultsSection.defaultProps = {
  downloadUrl: '',
  onDownload: () => {},
  passingUsersEnabled: false,
  filtersEnabled: false,
  onCourseOpen: () => {},
  onSort: () => {},
  onPage: () => {},
  onColumnsChange: () => {},
};
