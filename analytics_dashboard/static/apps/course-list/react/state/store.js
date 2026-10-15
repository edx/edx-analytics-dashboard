import { configureStore } from '@reduxjs/toolkit';

import coursesReducer from 'course-list/react/state/courses-slice';
import summaryReducer from 'course-list/react/state/summary-slice';

export default function createCourseListStore(preloadedState) {
  return configureStore({
    reducer: { courses: coursesReducer, summary: summaryReducer },
    preloadedState,
  });
}
