import { configureStore } from '@reduxjs/toolkit';

import coursesReducer from 'course-list/react/state/courses-slice';

export default function createCourseListStore(preloadedState) {
  return configureStore({
    reducer: { courses: coursesReducer },
    preloadedState,
  });
}
