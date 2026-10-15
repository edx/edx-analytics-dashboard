import { createSelectors, PAGE_SIZE } from 'course-list/react/state/selectors';

describe('selectors', () => {
  // A registry for the spec: the real one is checked in registries/spec/metrics-spec.js.
  const metrics = [
    { id: 'first', textKey: 'first_text', reduce: rows => rows.length },
    { id: 'second', textKey: 'second_text', reduce: rows => rows.reduce((sum, row) => sum + row.count, 0) },
  ];
  const filters = [{ id: 'color', matches: (row, selected) => selected.indexOf(row.color) !== -1 }];
  // A columns registry for the spec: the real one is checked in registries/spec/columns-spec.js.
  const columns = [
    {
      id: 'catalog_course_title', label: 'Course Name', cell: 'courseName', alwaysVisible: true,
    },
    { id: 'start_date', label: 'Start Date', cell: 'date' },
    { id: 'count', label: 'Current Enrollment', cell: 'number' },
    {
      id: 'passing_users', label: 'Passing Learners', cell: 'number', enabled: page => page.passingUsersEnabled,
    },
    {
      id: 'b2b_count', label: 'B2B Enrollment', cell: 'number', pending: true,
    },
    {
      id: 'total_engagements', label: 'Total Engagements', cell: 'number', pending: true, defaultVisible: false,
    },
  ];
  const selectors = createSelectors({
    filters, metrics, columns, showPendingColumns: true,
  });
  const { selectFilteredRows, selectSummaryMetrics } = selectors;
  const stateWith = (rows, query = {}, visibleColumns = null) => ({
    courses: { rows, programs: [], status: 'ready' },
    view: { visibleColumns },
    query: {
      search: '', filters: {}, sort: { key: 'catalog_course_title', dir: 'asc' }, page: 1, ...query,
    },
  });

  describe('selectSummaryMetrics', () => {
    it('has one entry per metric of the registry, in order, with its value computed from the rows', () => {
      const result = selectSummaryMetrics(stateWith([{ count: 5 }, { count: 7 }]));

      expect(result).toEqual([
        { id: 'first', textKey: 'first_text', value: 2 },
        { id: 'second', textKey: 'second_text', value: 12 },
      ]);
    });

    it('computes every value from no rows', () => {
      expect(selectSummaryMetrics(stateWith([])).map(entry => entry.value)).toEqual([0, 0]);
    });

    it('gives the same result object while the rows are the same', () => {
      const state = stateWith([{ count: 1 }]);

      expect(selectSummaryMetrics(state)).toBe(selectSummaryMetrics(state));
    });

    it('computes again when the rows change', () => {
      const first = selectSummaryMetrics(stateWith([{ count: 1 }]));
      const second = selectSummaryMetrics(stateWith([{ count: 1 }, { count: 2 }]));

      expect(first[1].value).toBe(1);
      expect(second[1].value).toBe(3);
    });
  });

  describe('selectFilteredRows', () => {
    const rows = [
      {
        course_id: 'course-v1:Edx+Algebra+2024', catalog_course_title: 'Algebra I', color: 'red', count: 1,
      },
      {
        course_id: 'course-v1:Edx+Biology+2023', catalog_course_title: 'Biology', color: 'blue', count: 2,
      },
      {
        course_id: 'course-v1:Edx+Drawing+2024', catalog_course_title: 'drawing basics', color: 'red', count: 4,
      },
    ];
    const titles = (query) => selectFilteredRows(stateWith(rows, query)).map(row => row.catalog_course_title);

    it('has every row without a search and filters', () => {
      expect(titles({})).toEqual(['Algebra I', 'Biology', 'drawing basics']);
    });

    it('matches any word of the search in the title or the course ID, ignoring case', () => {
      expect(titles({ search: 'ALGEBRA' })).toEqual(['Algebra I']);
      expect(titles({ search: 'biology DRAWING' })).toEqual(['Biology', 'drawing basics']);
      expect(titles({ search: 'edx+biology' })).toEqual(['Biology']);
      expect(titles({ search: '   ' }).length).toBe(3);
    });

    it('treats the search text as text, not as a pattern', () => {
      expect(titles({ search: '.*' })).toEqual([]);
    });

    it('keeps the rows that match every filter that has a selection', () => {
      expect(titles({ filters: { color: ['red'] } })).toEqual(['Algebra I', 'drawing basics']);
      expect(titles({ filters: { color: ['blue', 'red'] } }).length).toBe(3);
      expect(titles({ search: 'draw', filters: { color: ['red'] } })).toEqual(['drawing basics']);
      expect(titles({ search: 'biology', filters: { color: ['red'] } })).toEqual([]);
    });

    it('keeps the same rows and cards when only the sort or the page changes', () => {
      const state = stateWith(rows);
      const sorted = { ...state, query: { ...state.query, sort: { key: 'count', dir: 'desc' }, page: 2 } };

      expect(selectFilteredRows(sorted)).toBe(selectFilteredRows(state));
      expect(selectSummaryMetrics(sorted)).toBe(selectSummaryMetrics(state));
    });

    it('makes the summary cards follow the search and the filters', () => {
      const state = stateWith(rows, { filters: { color: ['red'] } });

      expect(selectSummaryMetrics(state).map(entry => entry.value)).toEqual([2, 5]);
    });
  });

  describe('selectSortedRows', () => {
    const rows = [
      {
        course_id: 'c-3', catalog_course_title: 'biology', start_date: '2024-05-01T00:00:00Z', count: 20,
      },
      {
        course_id: 'c-1', catalog_course_title: 'Algebra', start_date: '', count: 5,
      },
      {
        course_id: 'c-2', catalog_course_title: 'Algebra', start_date: '2023-01-01T00:00:00Z', count: 300,
      },
      {
        course_id: 'c-4', catalog_course_title: 'Chemistry', start_date: '2025-09-01T00:00:00Z', count: 20,
      },
    ];
    const ids = sort => selectors.selectSortedRows(stateWith(rows, { sort })).map(row => row.course_id);

    it('sorts by course name, ignoring case, with equal names in course ID order', () => {
      expect(ids({ key: 'catalog_course_title', dir: 'asc' })).toEqual(['c-1', 'c-2', 'c-3', 'c-4']);
      expect(ids({ key: 'catalog_course_title', dir: 'desc' })).toEqual(['c-4', 'c-3', 'c-1', 'c-2']);
    });

    it('sorts number columns as numbers', () => {
      expect(ids({ key: 'count', dir: 'desc' })).toEqual(['c-2', 'c-3', 'c-4', 'c-1']);
      expect(ids({ key: 'count', dir: 'asc' })).toEqual(['c-1', 'c-3', 'c-4', 'c-2']);
    });

    it('puts empty values last in both directions', () => {
      expect(ids({ key: 'start_date', dir: 'asc' })).toEqual(['c-2', 'c-3', 'c-4', 'c-1']);
      expect(ids({ key: 'start_date', dir: 'desc' })).toEqual(['c-4', 'c-3', 'c-2', 'c-1']);
    });

    it('keeps course ID order for a column no row has', () => {
      expect(ids({ key: 'b2b_count', dir: 'desc' })).toEqual(['c-1', 'c-2', 'c-3', 'c-4']);
    });
  });

  describe('paging and the count', () => {
    const many = Array.from({ length: PAGE_SIZE + 5 }, (value, index) => ({
      course_id: `c-${String(index).padStart(3, '0')}`, catalog_course_title: 'Course', color: index < 3 ? 'red' : 'blue',
    }));

    it('shows 100 course runs per page and counts all of them', () => {
      const state = stateWith(many);

      expect(PAGE_SIZE).toBe(100);
      expect(selectors.selectResultCount(state)).toBe(105);
      expect(selectors.selectPageCount(state)).toBe(2);
      expect(selectors.selectPageRows(state).length).toBe(100);
      expect(selectors.selectPageRows(stateWith(many, { page: 2 })).map(row => row.course_id))
        .toEqual(['c-100', 'c-101', 'c-102', 'c-103', 'c-104']);
    });

    it('shows the last page for a page past the end, and one page when nothing matches', () => {
      const filtered = stateWith(many, { page: 2, filters: { color: ['red'] } });

      expect(selectors.selectCurrentPage(filtered)).toBe(1);
      expect(selectors.selectPageRows(filtered).length).toBe(3);
      expect(selectors.selectPageCount(stateWith([]))).toBe(1);
    });
  });

  describe('selectAvailableColumns', () => {
    const ids = (state, page = { passingUsersEnabled: true, filtersEnabled: true }, from = selectors) => (
      from.selectAvailableColumns(state, page).map(column => `${column.id}:${column.hasData}`)
    );

    it('has every column, a pending column without data marked as such', () => {
      expect(ids(stateWith([{ course_id: 'a' }]))).toEqual([
        'catalog_course_title:true', 'start_date:true', 'count:true', 'passing_users:true', 'b2b_count:false',
        'total_engagements:false',
      ]);
    });

    it('leaves out a column whose waffle switch is off', () => {
      expect(ids(stateWith([]), { passingUsersEnabled: false, filtersEnabled: true }))
        .not.toContain('passing_users:true');
    });

    it('shows a pending column with its data as soon as a row has the field, a 0 included', () => {
      expect(ids(stateWith([{ course_id: 'a' }, { course_id: 'b', b2b_count: 0 }]))).toContain('b2b_count:true');
    });

    it('leaves out pending columns without data when they are not shown', () => {
      const released = createSelectors({
        filters, metrics, columns, showPendingColumns: false,
      });

      expect(ids(stateWith([{ course_id: 'a' }]), undefined, released)).not.toContain('b2b_count:false');
      expect(ids(stateWith([{ course_id: 'a', b2b_count: 3 }]), undefined, released)).toContain('b2b_count:true');
    });
  });

  describe('selectVisibleColumns', () => {
    const SWITCHES = { passingUsersEnabled: true, filtersEnabled: true };
    const ids = visible => selectors.selectVisibleColumns(stateWith([{ course_id: 'a' }], {}, visible), SWITCHES)
      .map(column => column.id);

    it('shows the columns that start visible until the user changes them', () => {
      expect(ids(null)).toEqual(['catalog_course_title', 'start_date', 'count', 'passing_users', 'b2b_count']);
    });

    it('shows Course Name and the ticked columns, in registry order, ignoring unknown ones', () => {
      expect(ids(['total_engagements', 'count', 'unknown'])).toEqual(['catalog_course_title', 'count', 'total_engagements']);
      expect(ids([])).toEqual(['catalog_course_title']);
    });
  });
});
