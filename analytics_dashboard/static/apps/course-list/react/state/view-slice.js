import { createSlice } from '@reduxjs/toolkit';

// Interface state that is not part of the query.
//   visibleColumns: the ids of the columns shown, or null for the registry's defaults
export const initialState = { visibleColumns: null };

const viewSlice = createSlice({
  name: 'view',
  initialState,
  reducers: {
    columnsChanged: (state, action) => ({
      ...state,
      visibleColumns: action.payload.filter(id => typeof id === 'string'),
    }),
  },
});

export const { columnsChanged } = viewSlice.actions;

export default viewSlice.reducer;
