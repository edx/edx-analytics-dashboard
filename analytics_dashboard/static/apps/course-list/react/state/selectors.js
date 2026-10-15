import { createSelector } from '@reduxjs/toolkit';

import filterRegistry from 'course-list/react/registries/filters';
import metricRegistry from 'course-list/react/registries/metrics';

/**
 * Builds the selectors that turn the stored course rows and the user's query into what the page shows. The
 * registries are parameters so specs can pass their own.
 */
export function createSelectors({ filters, metrics }) {
  const selectRows = state => state.courses.rows;
  const selectQuery = state => state.query;

  // The course runs that match the search text and the filters. Searching: a course run matches when any word of the
  // text is part of its title or course ID, ignoring case.
  const selectFilteredRows = createSelector(
    [selectRows, selectQuery],
    (rows, { search, filters: selected }) => {
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

  return { selectFilteredRows, selectSummaryMetrics };
}

export const { selectFilteredRows, selectSummaryMetrics } = createSelectors({
  filters: filterRegistry,
  metrics: metricRegistry,
});
