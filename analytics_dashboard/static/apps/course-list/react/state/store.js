import { configureStore } from '@reduxjs/toolkit';

import coursesReducer from 'course-list/react/state/courses-slice';
import queryReducer from 'course-list/react/state/query-slice';
import summaryReducer from 'course-list/react/state/summary-slice';

export default function createCourseListStore(preloadedState) {
  return configureStore({
    reducer: { courses: coursesReducer, query: queryReducer, summary: summaryReducer },
    preloadedState,
  });
}
