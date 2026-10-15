/**
 * The columns of the course table, in the order they are shown. Adding a column means adding one entry here.
 *
 *   id:             unique; the row field, and the key of the sort in the query
 *   label:          the header text
 *   cell:           which cell component draws it: 'link' | 'date' | 'number' | 'text'
 *   sortValue:      (row) => the value to sort by. Empty values (null, undefined, '') sort last when ascending.
 *   csvField:       the field name in the CSV export
 *   alwaysVisible:  true for columns the Columns menu can't hide (Course Name)
 *   defaultVisible: whether the column is shown until the user chooses otherwise
 *   requires:       null, or a page-data flag (e.g. 'enable_passing_users') that must be on for the column to exist
 */
export default [];
