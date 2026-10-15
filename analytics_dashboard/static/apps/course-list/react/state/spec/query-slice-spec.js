import reducer, {
  filterChanged, filtersCleared, pageChanged, queryRestored, searchChanged, sortChanged,
} from 'course-list/react/state/query-slice';

describe('query slice', () => {
  const start = () => reducer(undefined, { type: 'unknown' });

  it('starts with no search, no filters, sorted by course title ascending, on page 1', () => {
    expect(start()).toEqual({
      search: '',
      filters: {},
      timeframe: null,
      sort: { key: 'catalog_course_title', dir: 'asc' },
      page: 1,
    });
  });

  it('stores the search text and goes back to page 1', () => {
    const state = reducer(reducer(start(), pageChanged(3)), searchChanged('algebra'));

    expect(state.search).toBe('algebra');
    expect(state.page).toBe(1);
  });

  describe('filters', () => {
    it('stores the selected values of a filter and goes back to page 1', () => {
      const state = reducer(reducer(start(), pageChanged(3)), filterChanged({ id: 'availability', values: ['Current'] }));

      expect(state.filters).toEqual({ availability: ['Current'] });
      expect(state.page).toBe(1);
    });

    it('keeps the other filters when one changes', () => {
      let state = reducer(start(), filterChanged({ id: 'availability', values: ['Current'] }));
      state = reducer(state, filterChanged({ id: 'pacing_type', values: ['self_paced'] }));

      expect(state.filters).toEqual({ availability: ['Current'], pacing_type: ['self_paced'] });
    });

    it('removes a filter when nothing is selected in it', () => {
      let state = reducer(start(), filterChanged({ id: 'availability', values: ['Current'] }));
      state = reducer(state, filterChanged({ id: 'availability', values: [] }));

      expect(state.filters).toEqual({});
    });

    it('clears every filter but not the search', () => {
      let state = reducer(start(), searchChanged('algebra'));
      state = reducer(state, filterChanged({ id: 'availability', values: ['Current'] }));
      state = reducer(state, filtersCleared());

      expect(state.filters).toEqual({});
      expect(state.search).toBe('algebra');
    });
  });

  describe('sort', () => {
    it('starts a new column ascending', () => {
      expect(reducer(start(), sortChanged('count')).sort).toEqual({ key: 'count', dir: 'asc' });
    });

    it('reverses the direction when the sorted column is chosen again', () => {
      const once = reducer(start(), sortChanged('count'));
      const twice = reducer(once, sortChanged('count'));
      const thrice = reducer(twice, sortChanged('count'));

      expect(twice.sort).toEqual({ key: 'count', dir: 'desc' });
      expect(thrice.sort).toEqual({ key: 'count', dir: 'asc' });
    });

    it('goes back to page 1', () => {
      expect(reducer(reducer(start(), pageChanged(4)), sortChanged('count')).page).toBe(1);
    });
  });

  describe('page', () => {
    it('stores a valid page', () => {
      expect(reducer(start(), pageChanged(5)).page).toBe(5);
    });

    it('ignores anything that is not a whole number of 1 or more', () => {
      [0, -1, 2.5, '3', null, undefined].forEach((invalid) => {
        expect(reducer(start(), pageChanged(invalid)).page).toBe(1);
      });
    });
  });

  describe('queryRestored', () => {
    it('restores every valid part of a query', () => {
      const state = reducer(start(), queryRestored({
        search: 'bio',
        filters: { availability: ['Archived', 'Current'] },
        sort: { key: 'count', dir: 'desc' },
        page: 2,
      }));

      expect(state.search).toBe('bio');
      expect(state.filters).toEqual({ availability: ['Archived', 'Current'] });
      expect(state.sort).toEqual({ key: 'count', dir: 'desc' });
      expect(state.page).toBe(2);
    });

    it('keeps the current value of every part that is missing or invalid', () => {
      const state = reducer(start(), queryRestored({
        search: 5,
        filters: 'oops',
        sort: { key: 'count', dir: 'sideways' },
        page: 0,
      }));

      expect(state).toEqual(start());
    });

    it('drops filters with no valid values and values that are not text', () => {
      const state = reducer(start(), queryRestored({
        filters: { availability: ['Current', 7], pacing_type: [], program_ids: 'x' },
      }));

      expect(state.filters).toEqual({ availability: ['Current'] });
    });
  });
});
