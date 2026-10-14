import { configureStore } from '@reduxjs/toolkit';

import summaryReducer from 'course-list/react/state/summary-slice';

export default function createCourseListStore(preloadedState) {
  return configureStore({
    reducer: { summary: summaryReducer },
    preloadedState,
  });
}
