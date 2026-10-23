import columns from 'course-list/react/registries/columns';

// The CSV fields of each column; the server's CourseIndexCSV.column_fields holds the same list (checked by its test).
const csvColumns = require('course-list/react/spec/fixtures/csv-columns.json');

// Every entry that is added to the registry must have the keys the table reads (see the comment of the registry).
describe('columns registry', () => {
  const CELLS = ['courseName', 'date', 'number', 'percent', 'text'];
  const byId = id => columns.find(entry => entry.id === id);

  it('has entries with every required key, a known cell type and a unique id', () => {
    columns.forEach((entry) => {
      expect(Object.keys(entry)).toEqual(jasmine.arrayContaining(['id', 'label', 'cell']));
      expect(CELLS).toContain(entry.cell);
    });
    const ids = columns.map(entry => entry.id);
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });

  it('has a CSV export for every column, in the order of the table, as the server maps them', () => {
    expect(csvColumns.map(entry => entry.column)).toEqual(columns.map(entry => entry.id));
  });

  it('starts with Course Name, which is always visible', () => {
    expect(columns[0].id).toBe('catalog_course_title');
    expect(columns[0].alwaysVisible).toBe(true);
    expect(columns.filter(entry => entry.alwaysVisible).length).toBe(1);
  });

  it('has the columns of the prototype, in its order', () => {
    expect(columns.map(entry => entry.label)).toEqual([
      'Course Name', 'Start Date', 'End Date', 'Total Enrollment', 'Current Enrollment', 'Total Engagements',
      'Engagement Rate', 'Change Last Week', 'Verified Enrollment', 'Passing Learners', 'Program', 'Sales Model',
      'Funding Model', 'B2B Enrollment', 'B2C Enrollment', 'Subscription Enrollment', 'À la Carte Enrollment',
    ]);
  });

  it('marks the columns that wait for data as pending, and starts the engagement ones hidden', () => {
    expect(columns.filter(entry => entry.pending).map(entry => entry.id)).toEqual([
      'total_engagements', 'engagement_rate', 'sales_model', 'funding_model', 'b2b_count', 'b2c_count',
      'subscription_count', 'alacarte_count',
    ]);
    expect(columns.filter(entry => entry.defaultVisible === false).map(entry => entry.id))
      .toEqual(['total_engagements', 'engagement_rate']);
  });

  it('shows Passing Learners only with the enable_course_passing switch, and Program only with the filters', () => {
    expect(byId('passing_users').enabled({ passingUsersEnabled: true })).toBe(true);
    expect(byId('passing_users').enabled({ passingUsersEnabled: false })).toBe(false);
    expect(byId('program').enabled({ filtersEnabled: true })).toBe(true);
    expect(byId('program').enabled({ filtersEnabled: false })).toBe(false);
  });
});
