import { createSlice } from '@reduxjs/toolkit';

// What the user has chosen. Sorting and paging are added with the table.
//   search:  the text in the search box
//   filters: { <filter id>: [selected values] }; a filter with nothing selected is absent
const querySlice = createSlice({
  name: 'query',
  initialState: { search: '', filters: {} },
  reducers: {
    searchChanged: (state, action) => ({ ...state, search: String(action.payload) }),
    filterChanged: (state, action) => {
      const { id, values } = action.payload;
      const filters = { ...state.filters };
      if (values.length) {
        filters[id] = values;
      } else {
        delete filters[id];
      }
      return { ...state, filters };
    },
  },
});

export const { searchChanged, filterChanged } = querySlice.actions;
export const selectQuery = state => state.query;

export default querySlice.reducer;
