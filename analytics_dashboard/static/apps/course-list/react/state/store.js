import { configureStore } from '@reduxjs/toolkit';

import coursesReducer from 'course-list/react/state/courses-slice';
import queryReducer from 'course-list/react/state/query-slice';
import viewReducer from 'course-list/react/state/view-slice';

export default function createCourseListStore(preloadedState) {
  return configureStore({
    reducer: { courses: coursesReducer, query: queryReducer, view: viewReducer },
    preloadedState,
  });
}
