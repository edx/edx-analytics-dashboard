/**
 * The filters of the Courses section, in the order they are shown. Adding a filter (Pacing, Program, ...) means
 * adding one entry here.
 *
 *   id:      unique; the key of the filter in the query state
 *   label:   the text of its dropdown button
 *   options: [{ value, label }]
 *   matches: (row, selectedValues) => boolean; a course run is shown when it matches every filter that has
 *            a selection (values of one filter are alternatives, filters narrow each other)
 */
export default [
  {
    id: 'availability',
    label: 'Availability',
    options: [
      { value: 'Upcoming', label: 'Upcoming' },
      { value: 'Current', label: 'Current' },
      { value: 'Archived', label: 'Archived' },
      { value: 'unknown', label: 'Unknown' },
    ],
    matches: (row, selected) => selected.indexOf(row.availability) !== -1,
  },
];
