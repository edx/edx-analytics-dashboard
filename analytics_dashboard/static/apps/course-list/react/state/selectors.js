import { createSelector } from '@reduxjs/toolkit';

import columnRegistry, { SHOW_PENDING_COLUMNS } from 'course-list/react/registries/columns';
import filterRegistry, { resolveFilters } from 'course-list/react/registries/filters';
import metricRegistry from 'course-list/react/registries/metrics';
import {
  dateValue, isEmpty, isNumericCell, toNumber,
} from 'course-list/react/state/values';

export const PAGE_SIZE = 100;

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

  // The filters of the registry with their options, which for Program and Course come from the page data. A filter
  // waiting for data is left out until a row has it, unless showPending (by default, whether pending columns are
  // shown: the same rule as the columns). Call it as selectFilters(state, showPending). There is one memoized selector
  // per value of showPending, so callers passing different values don't make each other rebuild the lists.
  const filtersSelector = showPending => createSelector(
    [selectRows, state => state.courses.programs],
    (rows, programs) => resolveFilters({ rows, programs }, filters).filter(filter => (
      !filter.pendingFields || showPending
      || rows.some(row => filter.pendingFields.some(field => !isEmpty(row[field])))
    )),
  );
  const filtersSelectors = { true: filtersSelector(true), false: filtersSelector(false) };
  const selectFilters = (state, showPending = showPendingColumns) => filtersSelectors[Boolean(showPending)](state);

  // The course runs that match the search text and the filters. Searching: a course run matches when any word of the
  // text is part of its title or course ID, ignoring case.
  const matcher = (search, selected) => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    return (row) => {
      const text = `${row.catalog_course_title} ${row.course_id}`.toLowerCase();
      return (!words.length || words.some(word => text.indexOf(word) !== -1))
        && filters.every(filter => !selected[filter.id] || filter.matches(row, selected[filter.id]));
    };
  };
  const selectFilteredRows = createSelector(
    [selectRows, selectSearch, selectSelectedFilters],
    (rows, search, selected) => rows.filter(matcher(search, selected)),
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

  // All the rows in the order of the sort. Numbers compare as numbers (a value that isn't one counts as empty), dates
  // by their moment (whatever format the API sent), text ignoring case. Empty values are always last, whichever the
  // direction. Ties are in course ID order. The value to compare is worked out once per row, not on every comparison.
  // This depends only on the rows and the sort, so typing in the search doesn't sort again.
  const selectAllRowsSorted = createSelector(
    [selectRows, state => state.query.sort],
    (rows, sort) => {
      const column = columns.find(entry => entry.id === sort.key);
      const kind = column ? column.cell : 'text';
      const numeric = isNumericCell(kind);
      const direction = sort.dir === 'desc' ? -1 : 1;
      const sortValue = (row) => {
        const value = row[sort.key];
        if (isEmpty(value)) {
          return null;
        }
        if (kind === 'date') {
          return dateValue(value);
        }
        return numeric ? toNumber(value) : String(value).toLowerCase();
      };
      const compare = kind === 'date' || numeric ? (a, b) => a - b : (a, b) => a.localeCompare(b);
      return rows
        .map(row => ({ row, value: sortValue(row) }))
        .sort((x, y) => {
          if (x.value === null || y.value === null) {
            return ((x.value === null ? 1 : 0) - (y.value === null ? 1 : 0))
              || x.row.course_id.localeCompare(y.row.course_id);
          }
          return (compare(x.value, y.value) * direction) || x.row.course_id.localeCompare(y.row.course_id);
        })
        .map(item => item.row);
    },
  );

  // The rows that match the search and the filters, in the order of the sort.
  const selectSortedRows = createSelector(
    [selectAllRowsSorted, selectSearch, selectSelectedFilters],
    (sorted, search, selected) => sorted.filter(matcher(search, selected)),
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
    selectFilters,
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
  selectFilters,
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
