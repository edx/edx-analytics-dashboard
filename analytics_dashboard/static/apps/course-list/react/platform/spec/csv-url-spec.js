import buildCsvUrl from 'course-list/react/platform/csv-url';
import { buildHash } from 'course-list/react/platform/url-state';

describe('the link of Download CSV', () => {
  const BASE = '/courses/csv/course_list/';
  const query = (search, filters) => ({ search, filters });
  const build = (options = {}) => buildCsvUrl(BASE, {
    query: query('', {}), filtersEnabled: true, columns: ['start_date', 'count'], ...options,
  });

  it('asks the server for the filtered file, with the columns shown', () => {
    expect(build()).toBe(`${BASE}?filtered=true&cols=start_date%2Ccount`);
  });

  it('has the search, when there is one', () => {
    expect(build({ query: query('algebra', {}) })).toBe(`${BASE}?filtered=true&text_search=algebra&cols=start_date%2Ccount`);
    expect(build({ query: query('   ', {}) })).toBe(`${BASE}?filtered=true&cols=start_date%2Ccount`);
  });

  it('has the filters that have values, in the order of the registry, comma-separated', () => {
    const url = build({
      query: query('', {
        pacing_type: ['self_paced'], availability: ['Current', 'Upcoming'], program_ids: ['program-a'], courses: ['edX+Bio'],
      }),
    });

    expect(url).toBe(`${BASE}?filtered=true&program_ids=program-a&courses=edX%2BBio&availability=Current%2CUpcoming`
      + '&pacing_type=self_paced&cols=start_date%2Ccount');
  });

  it('leaves the filters out when the page offers none', () => {
    expect(build({ query: query('bio', { availability: ['Current'] }), filtersEnabled: false }))
      .toBe(`${BASE}?filtered=true&text_search=bio&cols=start_date%2Ccount`);
  });

  it('has an empty cols when no optional column is shown (the server always adds Course Name)', () => {
    expect(build({ columns: [] })).toBe(`${BASE}?filtered=true&cols=`);
  });

  it('encodes the values, as the address does', () => {
    const search = 'a&b=c #1 ü';
    const url = build({ query: query(search, {}) });
    const hash = buildHash({
      query: {
        search, filters: {}, sort: { key: 'count', dir: 'asc' }, page: 1,
      },
      visibleColumns: null,
    });

    expect(url).toContain('text_search=a%26b%3Dc%20%231%20%C3%BC&');
    // The same encoding as the address.
    expect(hash).toContain('text_search=a%26b%3Dc%20%231%20%C3%BC&');
  });

  it('adds to a URL that already has a query', () => {
    expect(buildCsvUrl('/csv/?x=1', { query: query('', {}), filtersEnabled: true, columns: [] }))
      .toBe('/csv/?x=1&filtered=true&cols=');
  });

  it('has neither the sort nor the page', () => {
    const url = build({ query: { ...query('', {}), sort: { key: 'count', dir: 'desc' }, page: 3 } });

    expect(url).not.toMatch(/sortKey|order=|page=/);
  });

  it('has the timeframe after the search, as the address does, and nothing for All Time', () => {
    const withTimeframe = timeframe => build({ query: { ...query('bio', { availability: ['Current'] }), timeframe } });

    expect(withTimeframe({ range: '30d', from: '', to: '' }))
      .toBe(`${BASE}?filtered=true&text_search=bio&timeframe=30d&availability=Current&cols=start_date%2Ccount`);
    expect(withTimeframe({ range: 'custom', from: '2026-10-21', to: '2026-10-24' }))
      .toContain('&timeframe=custom&from=2026-10-21&to=2026-10-24&');
    expect(withTimeframe({ range: 'all', from: '', to: '' })).not.toContain('timeframe');
  });

  it('leaves the timeframe out when the page offers no filters (it is in the filter bar)', () => {
    const url = build({ query: { ...query('', {}), timeframe: { range: '7d', from: '', to: '' } }, filtersEnabled: false });

    expect(url).not.toContain('timeframe');
  });
});
