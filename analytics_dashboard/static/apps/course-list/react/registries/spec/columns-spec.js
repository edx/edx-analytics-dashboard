import columns, { SHOW_PENDING_COLUMNS } from 'course-list/react/registries/columns';

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

  it('starts with Course Name, which is always visible', () => {
    expect(columns[0].id).toBe('catalog_course_title');
    expect(columns[0].alwaysVisible).toBe(true);
    expect(columns.filter(entry => entry.alwaysVisible).length).toBe(1);
  });

  it('has the columns of the prototype, in its order', () => {
    expect(columns.map(entry => entry.label)).toEqual([
      'Course Name', 'Start Date', 'End Date', 'Total Enrollment', 'Current Enrollment', 'Total Engagements',
      'Engagement Rate', 'Change Last Week', 'Verified Enrollment', 'Passing Learners', 'Sales Model',
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

  it('shows Passing Learners only when the enable_course_passing switch is on', () => {
    expect(byId('passing_users').enabled({ passingUsersEnabled: true })).toBe(true);
    expect(byId('passing_users').enabled({ passingUsersEnabled: false })).toBe(false);
  });

  it('shows pending columns during development; set SHOW_PENDING_COLUMNS to false before the release', () => {
    expect(typeof SHOW_PENDING_COLUMNS).toBe('boolean');
  });
});
