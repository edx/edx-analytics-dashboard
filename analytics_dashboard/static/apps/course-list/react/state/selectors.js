import { createSelector } from '@reduxjs/toolkit';

import filterRegistry from 'course-list/react/registries/filters';
import columnRegistry from 'course-list/react/registries/columns';

export const PAGE_SIZE = 100;
const SEARCH_FIELDS = ['catalog_course_title', 'course_id'];

const isEmpty = value => value === null || value === undefined || value === '';
const asText = value => (isEmpty(value) ? '' : String(value).toLowerCase());

function compareValues(a, b) {
  if (typeof a === 'string' || typeof b === 'string') {
    return String(a).localeCompare(String(b));
  }
  return a - b;
}

/**
 * Builds the selectors that turn the stored rows and the user's query into what the page shows:
 * filter, then search, then sort, then page. Everything that depends on the rows (table, count, cards, CSV
 * link) reads selectFilteredRows, so they can't disagree. The registries are parameters so specs can pass
 * their own.
 */
export function createSelectors({ filters, columns }) {
  const selectRows = state => state.courses.rows;
  const selectSearch = state => state.query.search;
  const selectSelectedFilters = state => state.query.filters;
  const selectSort = state => state.query.sort;
  const selectPage = state => state.query.page;

  const selectStatus = state => state.courses.status;

  // A row must match every filter that has a selection, and any word of the search. Selected filters that
  // aren't in the registry (for example from an old URL) are ignored.
  const selectFilteredRows = createSelector(
    [selectRows, selectSelectedFilters, selectSearch],
    (rows, selected, search) => {
      const active = filters.filter(entry => selected[entry.id] && selected[entry.id].length);
      const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
      return rows.filter(row => (
        active.every(entry => entry.matches(row, selected[entry.id]))
        && (!words.length || words.some(word => SEARCH_FIELDS.some(field => asText(row[field]).indexOf(word) !== -1)))
      ));
    },
  );

  // Empty values count as greater than any value, so they are last when ascending and first when descending.
  // Rows that compare equal keep their order.
  const selectSortedRows = createSelector(
    [selectFilteredRows, selectSort],
    (rows, sort) => {
      const column = columns.find(entry => entry.id === sort.key);
      const valueOf = column && column.sortValue ? column.sortValue : row => row[sort.key];
      const direction = sort.dir === 'desc' ? -1 : 1;
      return rows
        .map((row, index) => ({ row, index, value: valueOf(row) }))
        .sort((x, y) => {
          let result;
          if (isEmpty(x.value) || isEmpty(y.value)) {
            result = (isEmpty(x.value) ? 1 : 0) - (isEmpty(y.value) ? 1 : 0);
          } else {
            result = compareValues(x.value, y.value);
          }
          return (result * direction) || (x.index - y.index);
        })
        .map(item => item.row);
    },
  );

  const selectResultCount = createSelector([selectFilteredRows], rows => rows.length);

  const selectPageCount = createSelector([selectResultCount], count => Math.max(1, Math.ceil(count / PAGE_SIZE)));

  // A page past the end (for example after filtering) shows the last page.
  const selectPageRows = createSelector(
    [selectSortedRows, selectPage, selectPageCount],
    (rows, page, pageCount) => {
      const current = Math.min(Math.max(1, page), pageCount);
      return rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
    },
  );

  return {
    selectStatus,
    selectFilteredRows,
    selectSortedRows,
    selectPageRows,
    selectResultCount,
    selectPageCount,
  };
}

export const {
  selectStatus,
  selectFilteredRows,
  selectSortedRows,
  selectPageRows,
  selectResultCount,
  selectPageCount,
} = createSelectors({ filters: filterRegistry, columns: columnRegistry });
