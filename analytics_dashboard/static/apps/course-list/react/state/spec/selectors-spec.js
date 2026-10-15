import { createSelectors } from 'course-list/react/state/selectors';

describe('selectors', () => {
  // A registry for the spec: the real one is checked in registries/spec/metrics-spec.js.
  const metrics = [
    { id: 'first', textKey: 'first_text', reduce: rows => rows.length },
    { id: 'second', textKey: 'second_text', reduce: rows => rows.reduce((sum, row) => sum + row.count, 0) },
  ];
  const filters = [{ id: 'color', matches: (row, selected) => selected.indexOf(row.color) !== -1 }];
  const { selectFilteredRows, selectSummaryMetrics } = createSelectors({ filters, metrics });
  const stateWith = (rows, query = {}) => ({
    courses: { rows, programs: [], status: 'ready' },
    query: { search: '', filters: {}, ...query },
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

    it('makes the summary cards follow the search and the filters', () => {
      const state = stateWith(rows, { filters: { color: ['red'] } });

      expect(selectSummaryMetrics(state).map(entry => entry.value)).toEqual([2, 5]);
    });
  });
});
