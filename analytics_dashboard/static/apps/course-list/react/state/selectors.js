import { createSelector } from '@reduxjs/toolkit';

import columnRegistry, { SHOW_PENDING_COLUMNS } from 'course-list/react/registries/columns';
import filterRegistry from 'course-list/react/registries/filters';
import metricRegistry from 'course-list/react/registries/metrics';

export const PAGE_SIZE = 100;
const NUMERIC_CELLS = ['number', 'percent'];

const isEmpty = value => value === null || value === undefined || value === '';

/**
 * Builds the selectors that turn the stored course rows and the user's query into what the page shows. The
 * registries (and whether pending columns are shown) are parameters so specs can pass their own.
 */
export function createSelectors({
  filters, metrics, columns, showPendingColumns,
}) {
  const selectRows = state => state.courses.rows;
  const selectSearch = state => state.query.search;
  const selectSelectedFilters = state => state.query.filters;

  // The course runs that match the search text and the filters. Searching: a course run matches when any word of the
  // text is part of its title or course ID, ignoring case.
  const selectFilteredRows = createSelector(
    [selectRows, selectSearch, selectSelectedFilters],
    (rows, search, selected) => {
      const words = search.toLowerCase().split(/\s+/).filter(Boolean);
      return rows.filter((row) => {
        const text = `${row.catalog_course_title} ${row.course_id}`.toLowerCase();
        return (!words.length || words.some(word => text.indexOf(word) !== -1))
          && filters.every(filter => !selected[filter.id] || filter.matches(row, selected[filter.id]));
      });
    },
  );

  // One entry per metric of the registry, with its value computed from the filtered rows: the cards follow the filters.
  const selectSummaryMetrics = createSelector(
    [selectFilteredRows],
    rows => metrics.map(metric => ({
      id: metric.id,
      textKey: metric.textKey,
      value: metric.reduce(rows),
    })),
  );

  // The filtered rows in the order of the sort. Numbers compare as numbers; text, including dates (ISO strings),
  // compares ignoring case. Empty values are always last, whichever the direction. Ties are in course ID order.
  const selectSortedRows = createSelector(
    [selectFilteredRows, state => state.query.sort],
    (rows, sort) => {
      const column = columns.find(entry => entry.id === sort.key);
      const numeric = Boolean(column && NUMERIC_CELLS.indexOf(column.cell) !== -1);
      const direction = sort.dir === 'desc' ? -1 : 1;
      const compare = (a, b) => (numeric ? a - b : String(a).toLowerCase().localeCompare(String(b).toLowerCase()));
      return rows.slice().sort((x, y) => {
        const a = x[sort.key];
        const b = y[sort.key];
        if (isEmpty(a) || isEmpty(b)) {
          return ((isEmpty(a) ? 1 : 0) - (isEmpty(b) ? 1 : 0)) || x.course_id.localeCompare(y.course_id);
        }
        return (compare(a, b) * direction) || x.course_id.localeCompare(y.course_id);
      });
    },
  );

  const selectResultCount = createSelector([selectFilteredRows], rows => rows.length);

  const selectPageCount = createSelector([selectResultCount], count => Math.max(1, Math.ceil(count / PAGE_SIZE)));

  // The page in range: a page past the end (for example after filtering) is the last page.
  const selectCurrentPage = createSelector(
    [state => state.query.page, selectPageCount],
    (page, pageCount) => Math.min(Math.max(1, page), pageCount),
  );

  const selectPageRows = createSelector(
    [selectSortedRows, selectCurrentPage],
    (rows, page) => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  );

  // The columns that exist for this page, each with hasData: false for a pending column whose field no row has yet.
  // page: { passingUsersEnabled, filtersEnabled } (the waffle switches).
  const selectAvailableColumns = createSelector(
    [selectRows, (state, page) => page.passingUsersEnabled, (state, page) => page.filtersEnabled],
    (rows, passingUsersEnabled, filtersEnabled) => columns
      .filter(column => !column.enabled || column.enabled({ passingUsersEnabled, filtersEnabled }))
      .map(column => ({
        ...column,
        hasData: !column.pending || rows.some(row => !isEmpty(row[column.id])),
      }))
      .filter(column => column.hasData || showPendingColumns),
  );

  // The columns the table shows: Course Name, and the available columns ticked in the Columns menu (until the user
  // changes them, the ones the registry shows by default).
  const selectVisibleColumns = createSelector(
    [selectAvailableColumns, state => state.view.visibleColumns],
    (available, visible) => available.filter(column => column.alwaysVisible || (
      visible ? visible.indexOf(column.id) !== -1 : column.defaultVisible !== false
    )),
  );

  return {
    selectFilteredRows,
    selectSummaryMetrics,
    selectSortedRows,
    selectResultCount,
    selectPageCount,
    selectCurrentPage,
    selectPageRows,
    selectAvailableColumns,
    selectVisibleColumns,
  };
}

export const {
  selectFilteredRows,
  selectSummaryMetrics,
  selectSortedRows,
  selectResultCount,
  selectPageCount,
  selectCurrentPage,
  selectPageRows,
  selectAvailableColumns,
  selectVisibleColumns,
} = createSelectors({
  filters: filterRegistry,
  metrics: metricRegistry,
  columns: columnRegistry,
  showPendingColumns: SHOW_PENDING_COLUMNS,
});
