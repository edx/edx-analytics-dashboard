import reducer, {
  filterChanged, pageChanged, searchChanged, sortChanged,
} from 'course-list/react/state/query-slice';

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

  it('sets the sort, and starts again at the first page', () => {
    const state = reducer({ ...empty, page: 3 }, sortChanged({ key: 'count', dir: 'desc' }));

    expect(state.sort).toEqual({ key: 'count', dir: 'desc' });
    expect(state.page).toBe(1);
    expect(reducer(empty, sortChanged({ key: 'count', dir: 'sideways' })).sort.dir).toBe('asc');
  });

  it('sets the page, and ignores a page that is not a whole number from 1', () => {
    expect(reducer(empty, pageChanged(2)).page).toBe(2);
    expect(reducer(empty, pageChanged(0)).page).toBe(1);
    expect(reducer(empty, pageChanged(1.5)).page).toBe(1);
  });

  it('starts again at the first page after a new search or filter', () => {
    const onPage3 = { ...empty, page: 3 };

    expect(reducer(onPage3, searchChanged('algebra')).page).toBe(1);
    expect(reducer(onPage3, filterChanged({ id: 'availability', values: ['Current'] })).page).toBe(1);
  });
});
