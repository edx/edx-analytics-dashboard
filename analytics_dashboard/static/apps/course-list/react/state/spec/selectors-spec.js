import { normalizeCourseRows } from 'course-list/react/platform/course-rows';
import { initialState as initialQuery } from 'course-list/react/state/query-slice';
import { PAGE_SIZE, createSelectors } from 'course-list/react/state/selectors';

const fixture = require('course-list/react/spec/fixtures/course-list-rows.json');

describe('selectors', () => {
  // Registries for the specs: the real ones are empty until the filters and columns are built.
  const filters = [
    { id: 'availability', matches: (row, selected) => selected.indexOf(row.availability) !== -1 },
    { id: 'pacing_type', matches: (row, selected) => selected.indexOf(row.pacing_type) !== -1 },
  ];
  const columns = [
    { id: 'count', sortValue: row => row.count },
    { id: 'start_date', sortValue: row => row.start_date },
  ];
  const selectors = createSelectors({ filters, columns });
  const rows = normalizeCourseRows(fixture.rows, fixture.programs);
  const ALGEBRA = 'course-v1:Edx+Algebra+2024';
  const BIOLOGY = 'course-v1:Edx+Biology+2023';
  const CHEMISTRY = 'course-v1:Edx+Chemistry+2025';
  const DRAWING = 'course-v1:Edx+Drawing+2024';

  const stateWith = (query = {}, courseRows = rows, status = 'ready') => ({
    courses: { rows: courseRows, programs: fixture.programs, status },
    query: { ...initialQuery, ...query },
    view: { visibleColumns: null },
  });
  const ids = list => list.map(row => row.course_id);

  it('selects the status', () => {
    expect(selectors.selectStatus(stateWith({}, rows, 'unavailable'))).toBe('unavailable');
  });

  describe('filtering', () => {
    it('keeps every row when nothing is filtered or searched', () => {
      expect(selectors.selectFilteredRows(stateWith()).length).toBe(4);
    });

    it('keeps the rows that match any selected value of a filter (OR)', () => {
      const state = stateWith({ filters: { availability: ['Current', 'Upcoming'] } });

      expect(ids(selectors.selectFilteredRows(state))).toEqual([ALGEBRA, CHEMISTRY]);
    });

    it('keeps the rows that match every filter that has a selection (AND)', () => {
      const state = stateWith({ filters: { availability: ['Current', 'Upcoming'], pacing_type: ['self_paced'] } });

      expect(ids(selectors.selectFilteredRows(state))).toEqual([CHEMISTRY]);
    });

    it('treats a missing availability as unknown', () => {
      const state = stateWith({ filters: { availability: ['unknown'] } });

      expect(ids(selectors.selectFilteredRows(state))).toEqual([DRAWING]);
    });

    it('ignores a selected filter that is not in the registry', () => {
      const state = stateWith({ filters: { sales_model: ['B2B'] } });

      expect(selectors.selectFilteredRows(state).length).toBe(4);
    });

    it('ignores a registered filter that has nothing selected', () => {
      expect(selectors.selectFilteredRows(stateWith({ filters: { availability: [] } })).length).toBe(4);
    });
  });

  describe('search', () => {
    it('matches the course title, ignoring case', () => {
      expect(ids(selectors.selectFilteredRows(stateWith({ search: 'DRAWING' })))).toEqual([DRAWING]);
    });

    it('matches the course id', () => {
      expect(ids(selectors.selectFilteredRows(stateWith({ search: 'chemistry+2025' })))).toEqual([CHEMISTRY]);
    });

    it('matches a row that contains any word of the search', () => {
      expect(ids(selectors.selectFilteredRows(stateWith({ search: 'algebra biology' })))).toEqual([ALGEBRA, BIOLOGY]);
    });

    it('ignores spaces around the search', () => {
      expect(selectors.selectFilteredRows(stateWith({ search: '   ' })).length).toBe(4);
      expect(ids(selectors.selectFilteredRows(stateWith({ search: '  algebra ' })))).toEqual([ALGEBRA]);
    });

    it('does not treat regular expression characters specially', () => {
      expect(selectors.selectFilteredRows(stateWith({ search: '(' })).length).toBe(0);
    });

    it('matches only the search words, not other fields', () => {
      expect(selectors.selectFilteredRows(stateWith({ search: 'Archived' })).length).toBe(0);
    });

    it('combines with the filters (AND)', () => {
      const state = stateWith({ search: 'algebra biology', filters: { availability: ['Archived'] } });

      expect(ids(selectors.selectFilteredRows(state))).toEqual([BIOLOGY]);
    });
  });

  describe('sorting', () => {
    it('sorts text by the column\'s value, and numbers numerically', () => {
      const byTitle = selectors.selectSortedRows(stateWith({ sort: { key: 'catalog_course_title', dir: 'asc' } }));
      const byCount = selectors.selectSortedRows(stateWith({ sort: { key: 'count', dir: 'asc' } }));

      expect(ids(byTitle)).toEqual([ALGEBRA, BIOLOGY, CHEMISTRY, DRAWING]);
      expect(ids(byCount)).toEqual([CHEMISTRY, BIOLOGY, DRAWING, ALGEBRA]);
    });

    it('reverses the order when descending', () => {
      const byCount = selectors.selectSortedRows(stateWith({ sort: { key: 'count', dir: 'desc' } }));

      expect(ids(byCount)).toEqual([ALGEBRA, DRAWING, BIOLOGY, CHEMISTRY]);
    });

    it('puts empty values last when ascending and first when descending', () => {
      const ascending = selectors.selectSortedRows(stateWith({ sort: { key: 'start_date', dir: 'asc' } }));
      const descending = selectors.selectSortedRows(stateWith({ sort: { key: 'start_date', dir: 'desc' } }));

      // Chemistry has no start date (it becomes '' when the row is normalized).
      expect(ids(ascending)).toEqual([BIOLOGY, ALGEBRA, DRAWING, CHEMISTRY]);
      expect(ids(descending)).toEqual([CHEMISTRY, DRAWING, ALGEBRA, BIOLOGY]);
    });

    it('keeps rows with equal values in their original order', () => {
      const equal = normalizeCourseRows([
        { course_id: 'c', catalog_course_title: 'X', count: 1 },
        { course_id: 'a', catalog_course_title: 'Y', count: 1 },
        { course_id: 'b', catalog_course_title: 'Z', count: 1 },
      ]);

      ['asc', 'desc'].forEach((dir) => {
        const sorted = selectors.selectSortedRows(stateWith({ sort: { key: 'count', dir } }, equal));
        expect(ids(sorted)).toEqual(['c', 'a', 'b']);
      });
    });

    it('sorts by the row field when the column is not in the registry', () => {
      const sorted = selectors.selectSortedRows(stateWith({ sort: { key: 'cumulative_count', dir: 'desc' } }));

      expect(ids(sorted)).toEqual([BIOLOGY, ALGEBRA, DRAWING, CHEMISTRY]);
    });

    it('sorts only the rows that match the filters', () => {
      const state = stateWith({ filters: { pacing_type: ['self_paced'] }, sort: { key: 'count', dir: 'asc' } });

      expect(ids(selectors.selectSortedRows(state))).toEqual([CHEMISTRY, BIOLOGY]);
    });
  });

  describe('paging', () => {
    const manyRows = normalizeCourseRows(
      Array.from({ length: 250 }, (value, index) => ({
        course_id: `course-${index}`,
        catalog_course_title: `Course ${String(index).padStart(3, '0')}`,
      })),
    );

    it('shows 100 rows per page', () => {
      expect(PAGE_SIZE).toBe(100);
      expect(selectors.selectPageRows(stateWith({ page: 1 }, manyRows)).length).toBe(100);
      expect(selectors.selectPageRows(stateWith({ page: 3 }, manyRows)).length).toBe(50);
    });

    it('shows the rows of the requested page, in sorted order', () => {
      const secondPage = selectors.selectPageRows(stateWith({ page: 2 }, manyRows));

      expect(secondPage[0].course_id).toBe('course-100');
      expect(secondPage[99].course_id).toBe('course-199');
    });

    it('shows the last page when the page is past the end', () => {
      expect(ids(selectors.selectPageRows(stateWith({ page: 9 }, manyRows)))[0]).toBe('course-200');
    });

    it('counts the pages, with at least one', () => {
      expect(selectors.selectPageCount(stateWith({}, manyRows))).toBe(3);
      expect(selectors.selectPageCount(stateWith({}, []))).toBe(1);
    });
  });

  describe('counts', () => {
    it('counts the rows that match the filters and the search', () => {
      expect(selectors.selectResultCount(stateWith())).toBe(4);
      expect(selectors.selectResultCount(stateWith({ search: 'algebra' }))).toBe(1);
      expect(selectors.selectResultCount(stateWith({ filters: { pacing_type: ['self_paced'] } }))).toBe(2);
    });
  });
});
