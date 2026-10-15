import { createSlice } from '@reduxjs/toolkit';

// What the user has chosen. It is what the URL stores.
//   search:    the text in the search box
//   filters:   { <filter id>: [selected values] }; a filter with nothing selected is absent
//   timeframe: reserved for the Timeframe picker
//   sort:      { key: <column id>, dir: 'asc' | 'desc' }
//   page:      1-based
export const DEFAULT_SORT = { key: 'catalog_course_title', dir: 'asc' };
export const initialState = {
  search: '',
  filters: {},
  timeframe: null,
  sort: DEFAULT_SORT,
  page: 1,
};

const isString = value => typeof value === 'string';

/** Keeps only the valid parts of a query that comes from outside (the URL). */
function sanitizeQuery(query) {
  const clean = {};
  if (isString(query.search)) {
    clean.search = query.search;
  }
  if (typeof query.filters === 'object' && query.filters !== null) {
    clean.filters = {};
    Object.keys(query.filters).forEach((id) => {
      const values = Array.isArray(query.filters[id]) ? query.filters[id].filter(isString) : [];
      if (values.length) {
        clean.filters[id] = values;
      }
    });
  }
  if (query.sort && isString(query.sort.key) && (query.sort.dir === 'asc' || query.sort.dir === 'desc')) {
    clean.sort = { key: query.sort.key, dir: query.sort.dir };
  }
  if (Number.isInteger(query.page) && query.page >= 1) {
    clean.page = query.page;
  }
  return clean;
}

const querySlice = createSlice({
  name: 'query',
  initialState,
  reducers: {
    searchChanged: (state, action) => ({ ...state, search: String(action.payload), page: 1 }),
    filterChanged: (state, action) => {
      const { id, values } = action.payload;
      const filters = { ...state.filters };
      if (values.length) {
        filters[id] = values;
      } else {
        delete filters[id];
      }
      return { ...state, filters, page: 1 };
    },
    filtersCleared: state => ({ ...state, filters: {}, page: 1 }),
    // Choosing the column that is already sorted reverses the direction; a new column starts ascending.
    sortChanged: (state, action) => ({
      ...state,
      sort: state.sort.key === action.payload
        ? { key: action.payload, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' }
        : { key: action.payload, dir: 'asc' },
      page: 1,
    }),
    pageChanged: (state, action) => (
      Number.isInteger(action.payload) && action.payload >= 1 ? { ...state, page: action.payload } : state
    ),
    queryRestored: (state, action) => ({ ...state, ...sanitizeQuery(action.payload) }),
  },
});

export const {
  searchChanged, filterChanged, filtersCleared, sortChanged, pageChanged, queryRestored,
} = querySlice.actions;

export default querySlice.reducer;
