import { createSlice } from '@reduxjs/toolkit';

// What the user chose to see, which doesn't change the rows, the count or the cards.
//   visibleColumns: the ids of the columns ticked in the Columns menu, or null for the registry's defaults
//   urlInvalid:     true when the page's address had a parameter that can't be used (the page shows a message)
const viewSlice = createSlice({
  name: 'view',
  initialState: { visibleColumns: null, urlInvalid: false },
  reducers: {
    // What the page's address says about the view (platform/url-state.js): { visibleColumns, invalid }.
    viewRestored: (state, action) => ({
      visibleColumns: action.payload.visibleColumns,
      urlInvalid: Boolean(action.payload.invalid),
    }),
    columnsChanged: (state, action) => ({
      ...state,
      visibleColumns: action.payload.filter(id => typeof id === 'string'),
    }),
  },
});

export const { columnsChanged, viewRestored } = viewSlice.actions;
export const selectUrlInvalid = state => state.view.urlInvalid;

export default viewSlice.reducer;
