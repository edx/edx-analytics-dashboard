import { createSlice } from '@reduxjs/toolkit';

// What the user has chosen.
//   search:  the text in the search box
//   filters: { <filter id>: [selected values] }; a filter with nothing selected is absent
//   sort:    { key: <column id>, dir: 'asc' | 'desc' }
//   page:    1-based page of the table
export const DEFAULT_SORT = { key: 'catalog_course_title', dir: 'asc' };

const querySlice = createSlice({
  name: 'query',
  initialState: {
    search: '', filters: {}, sort: DEFAULT_SORT, page: 1,
  },
  reducers: {
    // A new search, filter or sort starts again at the first page.
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
    // payload: { key, dir }. The table decides the direction (numbers start descending), so it is set, not toggled.
    sortChanged: (state, action) => {
      const { key, dir } = action.payload;
      return { ...state, sort: { key, dir: dir === 'desc' ? 'desc' : 'asc' }, page: 1 };
    },
    pageChanged: (state, action) => (
      Number.isInteger(action.payload) && action.payload >= 1 ? { ...state, page: action.payload } : state
    ),
  },
});

export const {
  searchChanged, filterChanged, sortChanged, pageChanged,
} = querySlice.actions;
export const selectQuery = state => state.query;

export default querySlice.reducer;
