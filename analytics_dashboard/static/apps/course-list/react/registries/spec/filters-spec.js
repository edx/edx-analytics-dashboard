import { normalizeCourseRows } from 'course-list/react/platform/course-rows';
import filters, { resolveFilters } from 'course-list/react/registries/filters';

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

  it('is in the order of the prototype, with the legacy keys of the address', () => {
    expect(filters.map(entry => entry.id))
      .toEqual(['program_ids', 'courses', 'sales', 'funding', 'availability', 'pacing_type']);
  });

  it('waits for the data of Sales Model and Funding Model, the fields of the pending columns', () => {
    expect(filters.filter(entry => entry.pendingFields).map(entry => [entry.id, entry.pendingFields])).toEqual([
      ['sales', ['b2b_count', 'b2c_count']],
      ['funding', ['alacarte_count', 'subscription_count']],
    ]);
  });

  describe('sales and funding', () => {
    // b2b and subscription learners only; the second run has none of the fields yet.
    const segmentRows = [
      {
        course_id: 'run-1', b2b_count: 4, b2c_count: 0, subscription_count: 4, alacarte_count: 0,
      },
      { course_id: 'run-2' },
    ];
    const matching = (id, selected) => segmentRows.filter(row => byId(id).matches(row, selected))
      .map(row => row.course_id);

    const options = (id, data) => byId(id).options({ rows: data, programs: [] });

    it('offers the segments of the prototype while no row has learners in them (before the data comes)', () => {
      expect(options('sales', [{ course_id: 'run-2' }]))
        .toEqual([{ value: 'b2b', label: 'B2B' }, { value: 'b2c', label: 'B2C' }]);
      expect(options('funding', []))
        .toEqual([{ value: 'alacarte', label: 'À la carte' }, { value: 'subscription', label: 'Subscription' }]);
    });

    it('offers only the segments that have learners once the data comes', () => {
      expect(options('sales', segmentRows)).toEqual([{ value: 'b2b', label: 'B2B' }]);
      expect(options('funding', segmentRows)).toEqual([{ value: 'subscription', label: 'Subscription' }]);
    });

    it('matches the course runs with learners in one of the selected segments, none without the data', () => {
      expect(matching('sales', ['b2b'])).toEqual(['run-1']);
      expect(matching('sales', ['b2c'])).toEqual([]);
      expect(matching('sales', ['b2b', 'b2c'])).toEqual(['run-1']);
      expect(matching('funding', ['subscription'])).toEqual(['run-1']);
      expect(matching('funding', ['alacarte'])).toEqual([]);
    });
  });

  it('has a search box in the long lists only, with the placeholder of the prototype', () => {
    expect(filters.filter(entry => entry.searchLabel).map(entry => [entry.id, entry.searchLabel])).toEqual([
      ['program_ids', 'Filter programs'],
      ['courses', 'Filter courses'],
    ]);
  });

  describe('resolveFilters', () => {
    it('gives every entry an options list, building the ones that come from the page data', () => {
      const resolved = resolveFilters({ rows, programs: fixture.programs });

      resolved.forEach(entry => expect(Array.isArray(entry.options)).toBe(true));
    });

    it('keeps an entry whose options are a fixed list as it is', () => {
      const fixed = { id: 'fixed', options: [{ value: 'a', label: 'A' }] };

      expect(resolveFilters({ rows, programs: [] }, [fixed])[0]).toBe(fixed);
    });
  });

  describe('courses', () => {
    // Two runs of one catalog course, and a run the server sent without one.
    const courseRows = normalizeCourseRows([
      { course_id: 'run-2', catalog_course: 'edX+Bio', catalog_course_title: 'Biology' },
      { course_id: 'run-1', catalog_course: 'edX+Bio', catalog_course_title: 'Biology' },
      { course_id: 'run-3', catalog_course: null, catalog_course_title: 'Algebra' },
      { course_id: 'run-4', catalog_course: 'edX+Untitled' },
    ]);
    const matching = selected => courseRows.filter(row => byId('courses').matches(row, selected))
      .map(row => row.course_id);

    it('offers each course once, in title order; a run without a catalog course is its own course', () => {
      expect(byId('courses').options({ rows: courseRows, programs: [] })).toEqual([
        { value: 'run-3', label: 'Algebra' },
        { value: 'edX+Bio', label: 'Biology' },
        { value: 'edX+Untitled', label: 'edX+Untitled' },
      ]);
      expect(byId('courses').options({ rows: [], programs: [] })).toEqual([]);
    });

    it('matches every run of the selected courses', () => {
      expect(matching(['edX+Bio'])).toEqual(['run-2', 'run-1']);
      expect(matching(['run-3', 'edX+Untitled'])).toEqual(['run-3', 'run-4']);
    });
  });

  describe('program_ids', () => {
    const matching = selected => rows.filter(row => byId('program_ids').matches(row, selected))
      .map(row => row.catalog_course_title);

    it('offers the programs in title order, ignoring case', () => {
      const options = byId('program_ids').options({
        rows: [],
        programs: [
          { program_id: 'p-1', program_title: 'Banana' },
          { program_id: 'p-2', program_title: 'apple' },
          { program_id: 'p-3', program_title: 'Cherry' },
        ],
      });

      // A comparison by character code would put the capitals first: Banana, Cherry, apple.
      expect(options.map(option => option.label)).toEqual(['apple', 'Banana', 'Cherry']);
    });

    it('offers the programs the server sent, a program without a title by its ID', () => {
      const options = programs => byId('program_ids').options({ rows: [], programs });

      expect(options(fixture.programs)).toEqual([
        { value: 'program-a', label: 'Program A' },
        { value: 'program-b', label: 'Program B' },
      ]);
      expect(options([{ program_id: 'program-c' }, null, { program_title: 'No ID' }]))
        .toEqual([{ value: 'program-c', label: 'program-c' }]);
      expect(options([])).toEqual([]);
    });

    it('matches the course runs in one of the selected programs', () => {
      expect(matching(['program-b'])).toEqual(['Algebra I']);
      expect(matching(['program-a', 'program-b']).sort()).toEqual(['Algebra I', 'Biology']);
    });
  });

  describe('pacing_type', () => {
    const matching = selected => rows.filter(row => byId('pacing_type').matches(row, selected))
      .map(row => row.catalog_course_title);

    const options = data => byId('pacing_type').options({ rows: data, programs: [] });
    const legacy = [
      { value: 'instructor_paced', label: 'Instructor-Paced' },
      { value: 'self_paced', label: 'Self-Paced' },
    ];

    it('always offers the values of the legacy filter, whichever the rows have', () => {
      expect(options(rows)).toEqual(legacy);
      expect(options([{ pacing_type: 'self_paced' }, { pacing_type: '' }])).toEqual(legacy);
      expect(options([])).toEqual(legacy);
    });

    it('adds a value the rows have that the legacy filter doesn\'t know, once, as it is', () => {
      expect(options([{ pacing_type: 'new_paced' }, { pacing_type: 'new_paced' }]))
        .toEqual([...legacy, { value: 'new_paced', label: 'new_paced' }]);
    });

    it('matches the course runs with one of the selected values', () => {
      expect(matching(['self_paced']).sort()).toEqual(['Biology', 'Chemistry']);
      expect(matching(['instructor_paced', 'self_paced']).length).toBe(4);
    });
  });

  describe('availability', () => {
    const matching = selected => rows.filter(row => byId('availability').matches(row, selected))
      .map(row => row.catalog_course_title);

    const values = data => byId('availability').options({ rows: data, programs: [] }).map(option => option.value);

    const all = ['Archived', 'Current', 'unknown', 'Upcoming'];

    it('always offers all four values, Unknown included, in the prototype\'s alphabetical order', () => {
      expect(values(rows)).toEqual(all);
      expect(values([{ availability: 'Current' }])).toEqual(all);
      expect(values([])).toEqual(all);
      expect(byId('availability').options({ rows: [], programs: [] })[2]).toEqual({ value: 'unknown', label: 'Unknown' });
    });

    it('adds a value the rows have that isn\'t one of the four, after them', () => {
      expect(values([{ availability: 'Paused' }, { availability: 'Current' }])).toEqual([...all, 'Paused']);
    });

    it('matches the course runs with one of the selected values', () => {
      expect(matching(['Current'])).toEqual(['Algebra I']);
      expect(matching(['Upcoming', 'Archived']).sort()).toEqual(['Biology', 'Chemistry']);
    });
  });
});
