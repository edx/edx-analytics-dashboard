import { normalizeCourseRows } from 'course-list/react/platform/course-rows';
import filters from 'course-list/react/registries/filters';

const fixture = require('course-list/react/spec/fixtures/course-list-rows.json');

// Every entry that is added to the registry must have the keys the page reads (see the comment of the registry).
describe('filters registry', () => {
  const rows = normalizeCourseRows(fixture.rows, fixture.programs);
  const byId = id => filters.find(entry => entry.id === id);

  it('has entries with every required key and unique ids', () => {
    filters.forEach((entry) => {
      expect(Object.keys(entry)).toEqual(jasmine.arrayContaining(['id', 'label', 'options', 'matches']));
    });
    const ids = filters.map(entry => entry.id);
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });

  describe('availability', () => {
    const matching = selected => rows.filter(row => byId('availability').matches(row, selected))
      .map(row => row.catalog_course_title);

    it('offers the values the page data has, as the legacy filter did', () => {
      expect(byId('availability').options.map(option => option.value))
        .toEqual(['Upcoming', 'Current', 'Archived', 'unknown']);
    });

    it('matches the course runs with one of the selected values', () => {
      expect(matching(['Current'])).toEqual(['Algebra I']);
      expect(matching(['Upcoming', 'Archived']).sort()).toEqual(['Biology', 'Chemistry']);
    });
  });
});
