import { createSlice } from '@reduxjs/toolkit';

// text: the label and tooltip of every summary card, as the server sent them (the page data's summary_text):
//   { <textKey of a metric>: { label, tooltip } }
// The numbers are not stored: they are computed from the course rows (see selectors.js).
export const initialState = { text: {} };

const summarySlice = createSlice({
  name: 'summary',
  initialState,
  reducers: {
    summaryTextLoaded: (state, action) => ({ ...state, text: action.payload }),
  },
});

export const { summaryTextLoaded } = summarySlice.actions;

export const selectSummaryText = state => state.summary.text;

export default summarySlice.reducer;
