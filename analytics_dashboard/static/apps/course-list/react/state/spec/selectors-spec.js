import { createSelectors } from 'course-list/react/state/selectors';

describe('selectors', () => {
  // A registry for the spec: the real one is checked in registries/spec/metrics-spec.js.
  const metrics = [
    { id: 'first', textKey: 'first_text', reduce: rows => rows.length },
    { id: 'second', textKey: 'second_text', reduce: rows => rows.reduce((sum, row) => sum + row.count, 0) },
  ];
  const { selectSummaryMetrics } = createSelectors({ metrics });
  const stateWith = rows => ({ courses: { rows, programs: [], status: 'ready' } });

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
});
