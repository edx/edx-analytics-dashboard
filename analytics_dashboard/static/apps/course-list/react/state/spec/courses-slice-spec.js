import reducer, {
  acceptValidRows, coursesFailed, coursesLoaded, coursesUnavailable, initialState, selectStatus,
} from 'course-list/react/state/courses-slice';

describe('courses slice', () => {
  it('starts with no rows, no programs and the loading status', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual({ rows: [], programs: [], status: 'loading' });
    expect(initialState.status).toBe('loading');
  });

  it('stores the rows and programs and becomes ready when they are loaded', () => {
    const rows = [{ course_id: 'a' }];
    const programs = [{ program_id: 'p', course_ids: ['a'] }];

    expect(reducer(undefined, coursesLoaded({ rows, programs }))).toEqual({ rows, programs, status: 'ready' });
  });

  it('becomes unavailable, keeping what it has', () => {
    const state = reducer(undefined, coursesLoaded({ rows: [{ course_id: 'a' }], programs: [] }));

    expect(reducer(state, coursesUnavailable())).toEqual({ rows: [], programs: [], status: 'unavailable' });
  });

  it('becomes an error and drops the rows it had', () => {
    const state = reducer(undefined, coursesLoaded({ rows: [{ course_id: 'a' }], programs: [{ program_id: 'p' }] }));

    expect(reducer(state, coursesFailed())).toEqual({ rows: [], programs: [], status: 'error' });
  });

  it('selects its status from the store state', () => {
    expect(selectStatus({ courses: reducer(undefined, coursesUnavailable()) })).toBe('unavailable');
  });

  describe('acceptValidRows', () => {
    it('keeps rows that have a non-empty string course_id', () => {
      const rows = [{ course_id: 'a' }, { course_id: 'b', extra: 1 }];

      expect(acceptValidRows(rows)).toEqual({ rows, rejectedCount: 0 });
    });

    it('rejects anything else and counts it', () => {
      const result = acceptValidRows([{ course_id: 'a' }, {}, { course_id: '' }, { course_id: 5 }, null, 'text', 7]);

      expect(result.rows).toEqual([{ course_id: 'a' }]);
      expect(result.rejectedCount).toBe(6);
    });
  });
});
