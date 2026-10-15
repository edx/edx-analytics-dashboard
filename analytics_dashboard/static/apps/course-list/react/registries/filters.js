/**
 * The dropdown filters of the filter bar, in the order they are shown. Adding a filter means adding one entry here.
 *
 *   id:      unique; the key in the query's `filters` and in the page URL
 *   label:   the dropdown button's text
 *   options: (rows) => [{ value, label }]; what can be selected
 *   matches: (row, selectedValues) => boolean; selectedValues is never empty. A row must match every filter that
 *            has a selection (AND), and any one of a filter's selected values (OR).
 */
export default [];
