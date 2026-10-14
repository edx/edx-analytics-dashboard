import { createSlice } from '@reduxjs/toolkit';

// metrics: { totalEnrollment, currentEnrollment, enrollmentChange7Days, verifiedEnrollment, mastersEnrollment }
// text:    { totalEnrollment: { label, tooltip } }
// A key is absent until a valid value has been loaded. null means "loaded, no value" (shown as 0, like the template).
export const initialState = { metrics: {}, text: {} };

const isValidMetric = value => value === null || (typeof value === 'number' && Number.isFinite(value));
const isValidText = value => Boolean(value)
  && typeof value.label === 'string' && value.label !== ''
  && typeof value.tooltip === 'string';

/**
 * Splits a summary payload into its valid part and the keys that were rejected. Invalid values are never
 * stored, so widgets keep showing the last valid value.
 */
export function acceptValidSummary({ metrics, text }) {
  const accepted = { metrics: {}, text: {} };
  const rejectedKeys = [];
  Object.keys(metrics).forEach((key) => {
    if (isValidMetric(metrics[key])) {
      accepted.metrics[key] = metrics[key];
    } else {
      rejectedKeys.push(key);
    }
  });
  Object.keys(text).forEach((key) => {
    if (isValidText(text[key])) {
      accepted.text[key] = text[key];
    } else {
      rejectedKeys.push(`${key}.text`);
    }
  });
  return { accepted, rejectedKeys };
}

const summarySlice = createSlice({
  name: 'summary',
  initialState,
  reducers: {
    summaryLoaded: (state, action) => ({
      ...state,
      metrics: { ...state.metrics, ...action.payload.metrics },
      text: { ...state.text, ...action.payload.text },
    }),
  },
});

export const { summaryLoaded } = summarySlice.actions;

export const selectSummaryMetric = (state, metric) => state.summary.metrics[metric];
export const selectSummaryText = (state, key) => state.summary.text[key];

export default summarySlice.reducer;
