import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { DataTable } from '@openedx/paragon';

import {
  formatCount, formatDate, formatPercent,
} from 'course-list/react/platform/format';

const isEmpty = value => value === null || value === undefined || value === '';

// "--" with a reason for screen readers, as the legacy table shows a missing date.
function Missing({ reason }) {
  return (
    <span title={reason || undefined}>
      <span aria-hidden="true">--</span>
      {reason && <span className="sr-only">{reason}</span>}
    </span>
  );
}

Missing.propTypes = { reason: PropTypes.string };
Missing.defaultProps = { reason: '' };

// The cells. DataTable renders them with react-table's cell props; column is the DataTable column built below.
function PendingCell() {
  return <Missing reason="Data not available yet" />;
}

function CourseNameCell({ row, column }) {
  const { course_id: courseId, catalog_course_title: title } = row.original;
  return (
    <a className="insights-course-link" href={`/courses/${courseId}`} onClick={() => column.onCourseOpen(row.original)}>
      <span className="insights-course-title">{title}</span>
      <span className="insights-course-id">{courseId}</span>
    </a>
  );
}

CourseNameCell.propTypes = {
  row: PropTypes.shape({
    original: PropTypes.shape({
      course_id: PropTypes.string,
      catalog_course_title: PropTypes.string,
    }),
  }).isRequired,
  column: PropTypes.shape({ onCourseOpen: PropTypes.func }).isRequired,
};

function DateCell({ value }) {
  return formatDate(value) || <Missing reason="Date not available" />;
}

DateCell.propTypes = { value: PropTypes.string };
DateCell.defaultProps = { value: null };

function ValueCell({ value, column }) {
  return isEmpty(value) ? <Missing /> : column.format(value);
}

ValueCell.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  column: PropTypes.shape({ format: PropTypes.func }).isRequired,
};

ValueCell.defaultProps = { value: null };

const FORMATS = { number: formatCount, percent: formatPercent, text: String };

/**
 * A sortable header. DataTable sorts when the header cell is clicked, but the cell can't be reached with the keyboard,
 * so the label is a button: Enter or Space clicks it, and the click reaches the cell. The sort state is read out to
 * screen readers.
 */
function SortableHeader({ column }) {
  if (!column.canSort) {
    return column.label;
  }
  let state = '';
  if (column.isSorted) {
    state = column.isSortedDesc ? ', sorted descending' : ', sorted ascending';
  }
  return (
    <button type="button" className="insights-sort-button" title={`Sort by ${column.label}`}>
      {column.label}
      {state && <span className="sr-only">{state}</span>}
    </button>
  );
}

SortableHeader.propTypes = {
  column: PropTypes.shape({
    label: PropTypes.string,
    canSort: PropTypes.bool,
    isSorted: PropTypes.bool,
    isSortedDesc: PropTypes.bool,
  }).isRequired,
};

// DataTable keys each cell by `${column.Header}${row.id}`, so every column needs a Header whose text is unique.
function headerFor(id) {
  function Header(props) {
    return <SortableHeader {...props} />;
  }
  Header.displayName = 'SortableHeader';
  Header.toString = () => id;
  return Header;
}

/** Builds the DataTable column for one entry of the columns registry (see registries/columns.js). */
function toTableColumn(column, onCourseOpen) {
  const numeric = column.cell === 'number' || column.cell === 'percent';
  const tableColumn = {
    Header: headerFor(column.id),
    label: column.label,
    id: column.id,
    accessor: column.id,
    cellClassName: numeric ? 'insights-cell-number' : undefined,
    // Numbers sort descending on the first click, as decided for the new table; a column without data can't sort.
    sortDescFirst: numeric,
    disableSortBy: !column.hasData,
  };
  if (!column.hasData) {
    // A pending column whose data the server doesn't send yet.
    return { ...tableColumn, Cell: PendingCell };
  }
  if (column.cell === 'courseName') {
    return { ...tableColumn, Cell: CourseNameCell, onCourseOpen };
  }
  if (column.cell === 'date') {
    return { ...tableColumn, Cell: DateCell };
  }
  return { ...tableColumn, Cell: ValueCell, format: FORMATS[column.cell] || String };
}

// react-table options: the caller sorts the rows, so the table must not reset or remove the sort by itself.
const TABLE_OPTIONS = { autoResetSortBy: false, disableSortRemove: true, disableMultiSort: true };

/**
 * The course table: Paragon DataTable in manual sort mode, the way the Open edX MFEs use it. It shows the given rows
 * (one page, already filtered, sorted and paged by the caller) in the given columns. A header click calls
 * onSortChange(key, dir); the caller sorts and passes the new rows. onCourseOpen(row) is called when a course link is
 * clicked, for analytics.
 */
export default function CourseTable({
  columns, rows, sort, onSortChange, onCourseOpen,
}) {
  const tableColumns = useMemo(
    () => columns.map(column => toTableColumn(column, onCourseOpen)),
    [columns, onCourseOpen],
  );
  // The table starts with the caller's sort; afterwards it reports the user's clicks through fetchData.
  const [initialState] = useState(() => ({ sortBy: [{ id: sort.key, desc: sort.dir === 'desc' }] }));
  const fetchData = useCallback(({ sortBy }) => {
    const next = sortBy[0];
    const dir = next && next.desc ? 'desc' : 'asc';
    if (next && (next.id !== sort.key || dir !== sort.dir)) {
      onSortChange(next.id, dir);
    }
  }, [sort, onSortChange]);

  return (
    <div className="insights-course-table">
      <DataTable
        columns={tableColumns}
        data={rows}
        itemCount={rows.length}
        isSortable
        manualSortBy
        initialState={initialState}
        initialTableOptions={TABLE_OPTIONS}
        fetchData={fetchData}
      >
        <DataTable.Table />
      </DataTable>
    </div>
  );
}

CourseTable.propTypes = {
  // Entries of the columns registry, with hasData (see selectAvailableColumns).
  columns: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    cell: PropTypes.string.isRequired,
    hasData: PropTypes.bool.isRequired,
  })).isRequired,
  rows: PropTypes.arrayOf(PropTypes.shape({
    course_id: PropTypes.string.isRequired,
  })).isRequired,
  sort: PropTypes.shape({
    key: PropTypes.string.isRequired,
    dir: PropTypes.oneOf(['asc', 'desc']).isRequired,
  }).isRequired,
  onSortChange: PropTypes.func,
  onCourseOpen: PropTypes.func,
};

CourseTable.defaultProps = {
  onSortChange: () => {},
  onCourseOpen: () => {},
};
