import { normalizeCourseRows } from 'course-list/react/platform/course-rows';
import metrics from 'course-list/react/registries/metrics';

const fixture = require('course-list/react/spec/fixtures/course-list-rows.json');
const summaryText = require('course-list/react/spec/fixtures/summary-text.json');

// Every entry that is added to the registry must have the keys the page reads (see the comment of the registry).
describe('metrics registry', () => {
  const rows = normalizeCourseRows(fixture.rows, fixture.programs);
  const byId = id => metrics.find(entry => entry.id === id);

  // The server's numbers for the same rows. The Python test (test_presenters/test_course_summaries.py) checks the
  // fixture against CourseSummariesPresenter.get_course_summary_metrics, so this spec holds the registry to them.

  it('has entries with every required key', () => {
    metrics.forEach((entry) => {
      expect(Object.keys(entry)).toEqual(jasmine.arrayContaining(['id', 'textKey', 'reduce']));
    });
  });

  it('has unique ids and text keys', () => {
    const duplicates = list => list.filter((value, index) => list.indexOf(value) !== index);

    expect(duplicates(metrics.map(entry => entry.id))).toEqual([]);
    expect(duplicates(metrics.map(entry => entry.textKey))).toEqual([]);
  });

  it('has the cards of the prototype, in its order, each with text from the server', () => {
    // summary-text.json is what CourseIndex.get_context_data sends (checked by the Python view test).
    expect(metrics.map(entry => summaryText[entry.textKey].label)).toEqual([
      'Total Enrollment', 'Current Enrollment', 'Total Engagements', 'Change in Last Week', 'Verified Enrollment',
      "Master's Enrollment",
    ]);
  });

  it('names the row field of every pending entry', () => {
    metrics.filter(entry => entry.pending).forEach((entry) => {
      expect(typeof entry.field).toBe('string');
    });
  });

  [
    ['totalEnrollment', 'total_enrollment', 'cumulative_count'],
    ['currentEnrollment', 'current_enrollment', 'count'],
    ['enrollmentChange', 'enrollment_change_7_days', 'count_change_7_days'],
    ['verifiedEnrollment', 'verified_enrollment', 'enrollment_modes.verified.count'],
    ['mastersEnrollment', 'masters_enrollment', 'enrollment_modes.masters.count'],
  ].forEach(([id, summaryKey, field]) => {
    describe(id, () => {
      it(`is the sum of ${field} of the course runs, as the server computes it`, () => {
        // expected_summary is what CourseSummariesPresenter.get_course_summary_metrics gives for the same courses.
        expect(byId(id).reduce(rows)).toBe(fixture.expected_summary[summaryKey]);
      });

      it('is 0 for no course runs', () => {
        expect(byId(id).reduce([])).toBe(0);
      });

      it('counts a course without the number as 0', () => {
        expect(byId(id).reduce(normalizeCourseRows([{ course_id: 'b' }]))).toBe(0);
      });
    });
  });

  it('counts a course without Master\'s learners as 0 when another has some', () => {
    const withMissing = normalizeCourseRows([
      { course_id: 'a', enrollment_modes: { masters: { count: 3 } } },
      { course_id: 'b', enrollment_modes: { verified: { count: 2 } } },
      { course_id: 'c', enrollment_modes: { masters: {} } },
    ]);

    expect(byId('mastersEnrollment').reduce(withMissing)).toBe(3);
  });

  describe('totalEngagements', () => {
    it('is pending: the API does not send total_engagements yet', () => {
      expect(byId('totalEngagements').pending).toBe(true);
      expect(byId('totalEngagements').field).toBe('total_engagements');
    });

    it('is the sum of the course runs that have the number, once the API sends it', () => {
      const withData = normalizeCourseRows([
        { course_id: 'a', total_engagements: 30 },
        { course_id: 'b', total_engagements: '12' },
        { course_id: 'c' },
      ]);

      expect(byId('totalEngagements').reduce(withData)).toBe(42);
    });

    it('is kept absent by the row normalization when the API does not send it', () => {
      // Otherwise the page couldn't tell "no data yet" from 0 learners.
      expect('total_engagements' in normalizeCourseRows([{ course_id: 'a' }])[0]).toBe(false);
    });
  });
});
