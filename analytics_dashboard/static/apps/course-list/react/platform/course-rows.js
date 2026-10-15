// Course rows arrive from the server as course_list_json. The Backbone course list reshapes them in
// course-list/common/models/course.js and collections/course-list.js; this does the same, so the numbers and
// filters of the React page match the legacy page.

const NUMBER_FIELDS = ['count', 'cumulative_count', 'count_change_7_days', 'verified_enrollment', 'passing_users'];
const STRING_FIELDS = ['catalog_course_title', 'start_date', 'end_date', 'pacing_type'];

const asNumber = value => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

/**
 * @param {Object} raw - One course run of course_list_json (it has a course_id).
 * @param {Object[]} programs - programs_json: { program_id, course_ids }.
 * @returns {Object} The row as the React page stores it:
 *   - verified_enrollment is copied from enrollment_modes.verified.count (the table is flat);
 *   - an empty availability becomes 'unknown';
 *   - program_ids lists the programs the course belongs to, and program their titles, joined with ", " ('' when
 *     none; programs_json is only sent when the enable_course_filters switch is on);
 *   - missing numbers become 0 and missing text becomes ''.
 */
export function normalizeCourseRow(raw, programs = []) {
  const row = { ...raw };
  NUMBER_FIELDS.forEach((field) => {
    row[field] = asNumber(raw[field]);
  });
  STRING_FIELDS.forEach((field) => {
    row[field] = typeof raw[field] === 'string' ? raw[field] : '';
  });
  const verified = raw.enrollment_modes && raw.enrollment_modes.verified;
  row.verified_enrollment = verified ? asNumber(verified.count) : 0;
  row.availability = typeof raw.availability === 'string' && raw.availability !== '' ? raw.availability : 'unknown';
  const coursePrograms = programs.filter(program => (
    program && Array.isArray(program.course_ids) && program.course_ids.indexOf(raw.course_id) !== -1
  ));
  row.program_ids = coursePrograms.map(program => program.program_id);
  row.program = coursePrograms
    .map(program => program.program_title)
    .filter(title => typeof title === 'string' && title !== '')
    .join(', ');
  return row;
}

export function normalizeCourseRows(rawRows, programs = []) {
  return rawRows.map(raw => normalizeCourseRow(raw, programs));
}
