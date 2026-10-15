import reducer, { filterChanged, searchChanged } from 'course-list/react/state/query-slice';

describe('query slice', () => {
  const empty = {
    search: '', filters: {}, sort: { key: 'catalog_course_title', dir: 'asc' }, page: 1,
  };

  it('starts with no search and no filters, sorted by course name, on the first page', () => {
    expect(reducer(undefined, { type: 'init' })).toEqual(empty);
  });

  it('stores the search text', () => {
    expect(reducer(empty, searchChanged('algebra')).search).toBe('algebra');
  });

  it('stores the selected values of a filter, and drops a filter with nothing selected', () => {
    const selected = reducer(empty, filterChanged({ id: 'availability', values: ['Current'] }));
    expect(selected.filters).toEqual({ availability: ['Current'] });

    expect(reducer(selected, filterChanged({ id: 'availability', values: [] })).filters).toEqual({});
  });
});
