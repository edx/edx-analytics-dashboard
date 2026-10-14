import createCourseListStore from 'course-list/react/state/store';
import summaryReducer, {
  acceptValidSummary,
  initialState,
  selectSummaryMetric,
  selectSummaryText,
  summaryLoaded,
} from 'course-list/react/state/summary-slice';

describe('summary slice', () => {
  const text = { label: 'Total Enrollment', tooltip: 'Total enrollments across all of your courses.' };

  it('starts empty', () => {
    expect(summaryReducer(undefined, { type: 'init' })).toEqual(initialState);
    expect(initialState).toEqual({ metrics: {}, text: {} });
  });

  it('returns undefined from the selectors before anything is loaded', () => {
    const state = createCourseListStore().getState();

    expect(selectSummaryMetric(state, 'totalEnrollment')).toBeUndefined();
    expect(selectSummaryText(state, 'totalEnrollment')).toBeUndefined();
  });

  it('merges loaded metrics and text into the state', () => {
    const store = createCourseListStore();
    store.dispatch(summaryLoaded({ metrics: { totalEnrollment: 10, currentEnrollment: 5 }, text: {} }));
    store.dispatch(summaryLoaded({ metrics: { totalEnrollment: 20 }, text: { totalEnrollment: text } }));
    const state = store.getState();

    expect(state.summary.metrics).toEqual({ totalEnrollment: 20, currentEnrollment: 5 });
    expect(selectSummaryMetric(state, 'totalEnrollment')).toBe(20);
    expect(selectSummaryText(state, 'totalEnrollment')).toEqual(text);
  });

  describe('acceptValidSummary', () => {
    it('accepts numbers and null', () => {
      const { accepted, rejectedKeys } = acceptValidSummary({
        metrics: { totalEnrollment: 3378149, currentEnrollment: 0, verifiedEnrollment: null },
        text: { totalEnrollment: text },
      });

      expect(accepted).toEqual({
        metrics: { totalEnrollment: 3378149, currentEnrollment: 0, verifiedEnrollment: null },
        text: { totalEnrollment: text },
      });
      expect(rejectedKeys).toEqual([]);
    });

    it('rejects values that are not finite numbers and returns their keys', () => {
      const { accepted, rejectedKeys } = acceptValidSummary({
        metrics: {
          totalEnrollment: '3,378,149',
          currentEnrollment: NaN,
          enrollmentChange7Days: Infinity,
          verifiedEnrollment: { count: 1 },
          mastersEnrollment: 7,
        },
        text: {},
      });

      expect(accepted.metrics).toEqual({ mastersEnrollment: 7 });
      expect(rejectedKeys).toEqual([
        'totalEnrollment', 'currentEnrollment', 'enrollmentChange7Days', 'verifiedEnrollment',
      ]);
    });

    it('rejects text without a label or with a tooltip that is not a string', () => {
      const { accepted, rejectedKeys } = acceptValidSummary({
        metrics: {},
        text: {
          totalEnrollment: { label: '', tooltip: 'Help' },
          currentEnrollment: { label: 'Current Enrollment' },
          verifiedEnrollment: null,
          mastersEnrollment: { label: "Master's Enrollment", tooltip: '' },
        },
      });

      expect(accepted.text).toEqual({ mastersEnrollment: { label: "Master's Enrollment", tooltip: '' } });
      expect(rejectedKeys).toEqual([
        'totalEnrollment.text', 'currentEnrollment.text', 'verifiedEnrollment.text',
      ]);
    });
  });
});
