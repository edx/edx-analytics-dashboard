import { createSlice } from '@reduxjs/toolkit';

// rows:     the course runs, normalized by platform/course-rows.js
// programs: the programs as sent by the server (program_id, program_title, course_ids)
// status:   'loading' until the page data is read, then 'ready'; 'unavailable' when the server sent no course data;
//           'error' when the data is malformed.
export const initialState = { rows: [], programs: [], status: 'loading' };

const isObject = value => typeof value === 'object' && value !== null;

/**
 * Splits raw course rows into the valid ones (objects with a non-empty string course_id) and the number
 * rejected. Invalid rows are never stored.
 */
export function acceptValidRows(rawRows) {
  const rows = rawRows.filter(row => isObject(row) && typeof row.course_id === 'string' && row.course_id !== '');
  return { rows, rejectedCount: rawRows.length - rows.length };
}

const coursesSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    coursesLoaded: (state, action) => ({
      rows: action.payload.rows,
      programs: action.payload.programs,
      status: 'ready',
    }),
    coursesUnavailable: state => ({ ...state, status: 'unavailable' }),
    coursesFailed: state => ({ ...state, status: 'error' }),
  },
});

export const { coursesLoaded, coursesUnavailable, coursesFailed } = coursesSlice.actions;

export default coursesSlice.reducer;
