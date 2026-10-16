/**
 * Set to false before the page is released (see the release checklist in the plan): real users must never see a
 * column of "--". While true, pending columns (below) are shown even before the server sends their data, so the full
 * table can be built and reviewed.
 */
export const SHOW_PENDING_COLUMNS = true;

/**
 * The columns of the course table, in the order they are shown. Adding a column means adding one entry here.
 *
 *   id:             unique; the row field shown in the column, and the sort key
 *   label:          the header text
 *   tooltip:        the help text shown when the header is hovered or focused (the prototype's texts)
 *   cell:           how a value is drawn: 'courseName' | 'date' | 'number' | 'percent' | 'text'. Number and
 *                   percent columns sort descending on the first click, the others ascending.
 *   alwaysVisible:  true for Course Name, which the Columns menu can't hide
 *   defaultVisible: false for a column that starts hidden in the Columns menu (default true)
 *   enabled:        (page) => boolean; false when a waffle switch turns the column off (default: always on). page has
 *                   passingUsersEnabled and filtersEnabled.
 *   pending:        true for a column whose data the server may not send yet. Such a column shows "--" and can't be
 *                   sorted until a row has the field; while no row has it, the column is listed only if
 *                   SHOW_PENDING_COLUMNS is true (with data it is always listed). Its field must stay absent when
 *                   there is no data (platform/course-rows.js never fills it with 0).
 */
export default [
  {
    id: 'catalog_course_title',
    label: 'Course Name',
    tooltip: 'Course name advertised on edX site.',
    cell: 'courseName',
    alwaysVisible: true,
  },
  {
    id: 'start_date', label: 'Start Date', tooltip: 'Start date advertised on edX site.', cell: 'date',
  },
  {
    id: 'end_date', label: 'End Date', tooltip: 'End date set in edX Studio.', cell: 'date',
  },
  {
    id: 'cumulative_count',
    label: 'Total Enrollment',
    tooltip: 'Learners who ever enrolled in the course.',
    cell: 'number',
  },
  {
    id: 'count',
    label: 'Current Enrollment',
    tooltip: 'Learners currently enrolled in the course.',
    cell: 'number',
  },
  // No data or ticket yet: the same open metric as the Total Engagements card.
  {
    id: 'total_engagements',
    label: 'Total Engagements',
    tooltip: 'Learners active in the course.',
    cell: 'number',
    pending: true,
    defaultVisible: false,
  },
  {
    id: 'engagement_rate',
    label: 'Engagement Rate',
    tooltip: 'Active learners as a share of current enrollment.',
    cell: 'percent',
    pending: true,
    defaultVisible: false,
  },
  {
    id: 'count_change_7_days',
    label: 'Change Last Week',
    tooltip: 'Net difference in current enrollment in the last week.',
    cell: 'number',
  },
  {
    id: 'verified_enrollment',
    label: 'Verified Enrollment',
    tooltip: 'Number of currently enrolled learners pursuing a verified certificate of achievement.',
    cell: 'number',
  },
  {
    id: 'passing_users',
    label: 'Passing Learners',
    tooltip: 'Learners who have earned a passing grade.',
    cell: 'number',
    enabled: page => page.passingUsersEnabled,
  },
  // The program titles come from programs_json, which the server only sends with the filters switch on.
  {
    id: 'program',
    label: 'Program',
    tooltip: 'Programs this course belongs to; a course can belong to more than one.',
    cell: 'text',
    enabled: page => page.filtersEnabled,
  },
  // Sales and funding data comes with the data work for LP-1175, LP-1176 and LP-1187.
  {
    id: 'sales_model',
    label: 'Sales Model',
    tooltip: 'B2B (institutional contract) or B2C (direct consumer). Mixed when a course has both.',
    cell: 'text',
    pending: true,
  },
  {
    id: 'funding_model',
    label: 'Funding Model',
    tooltip: 'À la carte (single purchase) or Subscription (bundled access). Mixed when a course has both.',
    cell: 'text',
    pending: true,
  },
  {
    id: 'b2b_count',
    label: 'B2B Enrollment',
    tooltip: 'Subset of Current Enrollment attributed to B2B contracts.',
    cell: 'number',
    pending: true,
  },
  {
    id: 'b2c_count',
    label: 'B2C Enrollment',
    tooltip: 'Subset of Current Enrollment attributed to direct B2C sales.',
    cell: 'number',
    pending: true,
  },
  {
    id: 'subscription_count',
    label: 'Subscription Enrollment',
    tooltip: 'Learners accessing via the subscription funding model.',
    cell: 'number',
    pending: true,
  },
  {
    id: 'alacarte_count',
    label: 'À la Carte Enrollment',
    tooltip: 'Learners accessing via single à la carte purchase.',
    cell: 'number',
    pending: true,
  },
];
