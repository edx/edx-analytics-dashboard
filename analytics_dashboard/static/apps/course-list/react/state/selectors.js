import { createSelector } from '@reduxjs/toolkit';

import metricRegistry from 'course-list/react/registries/metrics';

/**
 * Builds the selectors that turn the stored course rows into what the page shows. The registries are parameters so
 * specs can pass their own.
 */
export function createSelectors({ metrics }) {
  const selectRows = state => state.courses.rows;

  // One entry per metric of the registry, with its value computed from the rows. The rows are not filtered yet:
  // when filters are added they narrow the rows first, and the cards follow them.
  const selectSummaryMetrics = createSelector(
    [selectRows],
    rows => metrics.map(metric => ({
      id: metric.id,
      textKey: metric.textKey,
      value: metric.reduce(rows),
    })),
  );

  return { selectSummaryMetrics };
}

export const { selectSummaryMetrics } = createSelectors({ metrics: metricRegistry });
