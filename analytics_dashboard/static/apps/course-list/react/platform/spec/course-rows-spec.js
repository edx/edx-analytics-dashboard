import { normalizeCourseRow, normalizeCourseRows } from 'course-list/react/platform/course-rows';

const fixture = require('course-list/react/spec/fixtures/course-list-rows.json');

describe('course rows', () => {
  const [algebra, , chemistry, drawing] = fixture.rows;

  it('copies the verified enrollment count out of enrollment_modes, as the legacy table does', () => {
    expect(normalizeCourseRow(algebra).verified_enrollment).toBe(40);
  });

  it('sets verified_enrollment to 0 when the course has no verified mode', () => {
    expect(normalizeCourseRow({ course_id: 'a', enrollment_modes: {} }).verified_enrollment).toBe(0);
    expect(normalizeCourseRow({ course_id: 'a' }).verified_enrollment).toBe(0);
  });

  it('copies the Master\'s enrollment count out of enrollment_modes, as the server\'s summary does', () => {
    expect(normalizeCourseRow(drawing).masters_enrollment).toBe(4);
  });

  it('sets masters_enrollment to 0 when the course has no Master\'s mode or no number for it', () => {
    expect(normalizeCourseRow(algebra).masters_enrollment).toBe(0);
    expect(normalizeCourseRow({ course_id: 'a' }).masters_enrollment).toBe(0);
    expect(normalizeCourseRow({ course_id: 'a', enrollment_modes: { masters: {} } }).masters_enrollment).toBe(0);
  });

  it('keeps the segment counts the Sales Model and Funding Model filters read, and leaves them out when missing', () => {
    const counts = {
      b2b_count: 4, b2c_count: 1, alacarte_count: 2, subscription_count: 3,
    };
    const row = normalizeCourseRow({ course_id: 'a', ...counts });

    expect(row).toEqual(jasmine.objectContaining(counts));
    expect('b2b_count' in normalizeCourseRow({ course_id: 'b' })).toBe(false);
  });

  it('keeps the availability, and turns an empty one into unknown', () => {
    expect(normalizeCourseRow(algebra).availability).toBe('Current');
    expect(normalizeCourseRow(drawing).availability).toBe('unknown');
    expect(normalizeCourseRow({ course_id: 'a' }).availability).toBe('unknown');
  });

  it('lists the programs a course belongs to', () => {
    expect(normalizeCourseRow(algebra, fixture.programs).program_ids).toEqual(['program-a', 'program-b']);
    expect(normalizeCourseRow(chemistry, fixture.programs).program_ids).toEqual([]);
  });

  it('gives every course an empty program list when there are no programs', () => {
    expect(normalizeCourseRow(algebra).program_ids).toEqual([]);
  });

  it('turns missing numbers into 0 and missing text into an empty string', () => {
    const row = normalizeCourseRow({
      course_id: 'a', count: null, cumulative_count: 'x', start_date: null,
    });

    expect(row.count).toBe(0);
    expect(row.cumulative_count).toBe(0);
    expect(row.count_change_7_days).toBe(0);
    expect(row.passing_users).toBe(0);
    expect(row.start_date).toBe('');
    expect(row.catalog_course_title).toBe('');
  });

  it('keeps the fields it does not change', () => {
    const row = normalizeCourseRow(algebra);

    expect(row.course_id).toBe('course-v1:Edx+Algebra+2024');
    expect(row.catalog_course_title).toBe('Algebra I');
    expect(row.count).toBe(120);
    expect(row.cumulative_count).toBe(300);
    expect(row.count_change_7_days).toBe(5);
    expect(row.passing_users).toBe(12);
  });

  it('does not change the row it is given', () => {
    const raw = { course_id: 'a', enrollment_modes: { verified: { count: 3 } } };

    normalizeCourseRow(raw, fixture.programs);

    expect(raw).toEqual({ course_id: 'a', enrollment_modes: { verified: { count: 3 } } });
  });

  it('normalizes every row of a list, in order', () => {
    const rows = normalizeCourseRows(fixture.rows, fixture.programs);

    expect(rows.map(row => row.course_id)).toEqual(fixture.rows.map(row => row.course_id));
    expect(rows[0].program_ids).toEqual(['program-a', 'program-b']);
  });

  it('adds the titles of the programs the course belongs to, and none without programs_json', () => {
    const programs = normalizeCourseRows(fixture.rows, fixture.programs).map(row => row.program);

    expect(programs).toEqual(['Program A, Program B', 'Program A', '', '']);
    expect(normalizeCourseRows(fixture.rows)[0].program).toBe('');
  });
});
