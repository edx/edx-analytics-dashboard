import { normalizeCourseRows } from 'course-list/react/platform/course-rows';
import metrics from 'course-list/react/registries/metrics';

const fixture = require('course-list/react/spec/fixtures/course-list-rows.json');

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

  describe('totalEnrollment', () => {
    it('is the sum of the all-time enrollment of the course runs, as the server computes it', () => {
      // expected_summary is what CourseSummariesPresenter.get_course_summary_metrics gives for the same courses.
      expect(byId('totalEnrollment').reduce(rows)).toBe(fixture.expected_summary.total_enrollment);
    });

    it('is 0 for no course runs', () => {
      expect(byId('totalEnrollment').reduce([])).toBe(0);
    });

    it('counts a course without an enrollment as 0', () => {
      const withMissing = normalizeCourseRows([{ course_id: 'a', cumulative_count: 5 }, { course_id: 'b' }]);

      expect(byId('totalEnrollment').reduce(withMissing)).toBe(5);
    });
  });
});
