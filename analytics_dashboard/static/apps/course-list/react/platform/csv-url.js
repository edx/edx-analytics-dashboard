import {
  encodeParams, filterParams, searchParams, timeframeParams,
} from 'course-list/react/platform/url-state';

/**
 * The link of the Download CSV button: the server's CSV URL with the course list's search, timeframe, filters and
 * columns, so the file has what the table shows (the server's CourseIndexCSV reads these). The keys are the page's
 * address keys, built by the same functions, so the file and the address can't disagree. `filtered=true` is what makes
 * the server use them (without it the file is the whole list, as the legacy page downloads it).
 *
 * @param {string} baseUrl - course_list_download_url.
 * @param {Object} options - query: { search, timeframe, filters } of the query slice; filtersEnabled: whether the
 *   filters switch is on (the timeframe and the filters are left out otherwise, as the page offers neither);
 *   columns: the ids of the optional columns shown (the server always adds Course Name).
 */
export default function buildCsvUrl(baseUrl, { query, filtersEnabled, columns }) {
  const params = [
    ['filtered', 'true'],
    ...searchParams(query),
    ...(filtersEnabled ? [...timeframeParams(query), ...filterParams(query)] : []),
    ['cols', columns.join(',')],
  ];
  return `${baseUrl}${baseUrl.indexOf('?') === -1 ? '?' : '&'}${encodeParams(params)}`;
}
