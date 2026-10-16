/**
 * The filters of the Courses section, in the order they are shown. Adding a filter means adding one entry here.
 *
 *   id:      unique; the key of the filter in the query state and in the page's address (the legacy keys)
 *   label:   the text of its dropdown button
 *   options: [{ value, label }], or a function ({ rows, programs }) => [{ value, label }] for options that come from
 *            the page data (state.courses); a filter with no options isn't shown, as in the legacy page. Availability
 *            and Pacing offer their fixed list plus any other value the data has; Sales Model and Funding Model the
 *            segments with learners, or their fixed list while no row has any
 *   matches: (row, selectedValues) => boolean; a course run is shown when it matches every filter that has
 *            a selection (values of one filter are alternatives, filters narrow each other)
 *   searchLabel: optional; puts a search box with this placeholder in the dropdown, for long lists
 *   pendingFields: optional; the row fields of a filter whose data the server may not send yet (as the pending columns
 *            of registries/columns.js). It is shown once a row has one of them, or before that while
 *            SHOW_PENDING_COLUMNS is true; until the data comes, nothing matches it.
 */

// The course a run belongs to: its catalog course, or the run itself when the server has none.
const courseKey = row => row.catalog_course || row.course_id;

// A course run matches a segment filter (Sales Model, Funding Model) when it has learners in one of the selected
// segments, as in the prototype: the value `b2b` reads the row's `b2b_count`, and so on.
const hasLearnersIn = (row, selected) => selected.some(value => Number(row[`${value}_count`]) > 0);

// Label order ignoring case (not every browser's localeCompare does), then the value.
const byLabel = (a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase())
  || a.label.localeCompare(b.label) || a.value.localeCompare(b.value);

/**
 * The fixed list of a filter, always in full (as in the prototype), and after it, in label order, any other value of
 * `field` that the rows have (shown as is), so a new value from the server can be filtered on too.
 */
const valueOptions = (field, fixed) => ({ rows }) => {
  const known = fixed.map(option => option.value);
  const others = rows.map(row => row[field])
    .filter(value => typeof value === 'string' && value !== '' && known.indexOf(value) === -1);
  return fixed.concat(others
    .filter((value, index) => others.indexOf(value) === index)
    .map(value => ({ value, label: value }))
    .sort(byLabel));
};

/**
 * The segments of `fixed` that have learners in the rows (the value `b2b` reads `b2b_count`), in its order; `fixed`
 * while no row has learners in any of them (before the server sends the data, for one).
 */
const segmentOptions = fixed => ({ rows }) => {
  const withLearners = fixed.filter(option => rows.some(row => Number(row[`${option.value}_count`]) > 0));
  return withLearners.length ? withLearners : fixed;
};

const filters = [
  {
    id: 'program_ids',
    label: 'Program',
    searchLabel: 'Filter programs',
    // The programs the server sent, in title order; one without a title shows its ID.
    options: ({ programs }) => programs
      .filter(program => program && typeof program.program_id === 'string' && program.program_id !== '')
      .map(program => ({ value: program.program_id, label: program.program_title || program.program_id }))
      .sort(byLabel),
    matches: (row, selected) => row.program_ids.some(id => selected.indexOf(id) !== -1),
  },
  {
    id: 'courses',
    label: 'Course',
    searchLabel: 'Filter courses',
    // One option per course, whichever of its runs are listed, in title order; one without a title shows its key.
    options: ({ rows }) => {
      const titles = {};
      rows.forEach((row) => {
        const key = courseKey(row);
        if (!titles[key]) {
          titles[key] = row.catalog_course_title || key;
        }
      });
      return Object.keys(titles)
        .map(key => ({ value: key, label: titles[key] }))
        .sort(byLabel);
    },
    matches: (row, selected) => selected.indexOf(courseKey(row)) !== -1,
  },
  // Sales and funding data comes with the data work for LP-1175, LP-1176 and LP-1187 (the same fields as the B2B, B2C,
  // Subscription and À la carte columns).
  {
    id: 'sales',
    label: 'Sales Model',
    options: segmentOptions([
      { value: 'b2b', label: 'B2B' },
      { value: 'b2c', label: 'B2C' },
    ]),
    pendingFields: ['b2b_count', 'b2c_count'],
    matches: hasLearnersIn,
  },
  {
    id: 'funding',
    label: 'Funding Model',
    options: segmentOptions([
      { value: 'alacarte', label: 'À la carte' },
      { value: 'subscription', label: 'Subscription' },
    ]),
    pendingFields: ['alacarte_count', 'subscription_count'],
    matches: hasLearnersIn,
  },
  {
    id: 'availability',
    label: 'Availability',
    // In alphabetical order, as in the prototype. An empty availability is 'unknown' (platform/course-rows.js).
    options: valueOptions('availability', [
      { value: 'Archived', label: 'Archived' },
      { value: 'Current', label: 'Current' },
      { value: 'unknown', label: 'Unknown' },
      { value: 'Upcoming', label: 'Upcoming' },
    ]),
    matches: (row, selected) => selected.indexOf(row.availability) !== -1,
  },
  {
    id: 'pacing_type',
    label: 'Pacing',
    options: valueOptions('pacing_type', [
      { value: 'instructor_paced', label: 'Instructor-Paced' },
      { value: 'self_paced', label: 'Self-Paced' },
    ]),
    matches: (row, selected) => selected.indexOf(row.pacing_type) !== -1,
  },
];

/** The filters with their options worked out from the page data ({ rows, programs }), so every entry has a list. */
export function resolveFilters(data, entries = filters) {
  return entries.map(filter => (
    typeof filter.options === 'function' ? { ...filter, options: filter.options(data) } : filter
  ));
}

export default filters;
