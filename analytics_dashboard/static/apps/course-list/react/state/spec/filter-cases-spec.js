import { normalizeCourseRows } from 'course-list/react/platform/course-rows';
import { coursesLoaded } from 'course-list/react/state/courses-slice';
import { filterChanged, searchChanged } from 'course-list/react/state/query-slice';
import { selectFilteredRows } from 'course-list/react/state/selectors';
import createCourseListStore from 'course-list/react/state/store';

const fixture = require('course-list/react/spec/fixtures/course-list-filter-cases.json');

// The search and the filters of the page, with the real registries, must show the course runs of each case. The
// Python test of CourseSummariesPresenter.filter_by_query runs the same cases, so the page's table and the downloaded
// CSV (which the server filters) give the same course runs.
describe('the search and filter cases shared with the server', () => {
  const rows = normalizeCourseRows(fixture.rows, fixture.programs);

  fixture.cases.forEach((testCase) => {
    it(`shows the right course runs: ${testCase.name}`, () => {
      const store = createCourseListStore();
      store.dispatch(coursesLoaded({ rows, programs: fixture.programs }));
      store.dispatch(searchChanged(testCase.search));
      Object.keys(testCase.filters).forEach((id) => {
        store.dispatch(filterChanged({ id, values: testCase.filters[id] }));
      });

      expect(selectFilteredRows(store.getState()).map(row => row.course_id)).toEqual(testCase.course_ids);
    });
  });
});
