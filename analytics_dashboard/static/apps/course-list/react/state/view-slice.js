import { createSlice } from '@reduxjs/toolkit';

// What the user chose to see, which doesn't change the rows, the count or the cards.
//   visibleColumns: the ids of the columns ticked in the Columns menu, or null for the registry's defaults
const viewSlice = createSlice({
  name: 'view',
  initialState: { visibleColumns: null },
  reducers: {
    columnsChanged: (state, action) => ({
      ...state,
      visibleColumns: action.payload.filter(id => typeof id === 'string'),
    }),
  },
});

export const { columnsChanged } = viewSlice.actions;

export default viewSlice.reducer;
