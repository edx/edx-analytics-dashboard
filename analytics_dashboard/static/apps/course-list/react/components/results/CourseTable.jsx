import { useMemo } from 'react';
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

/** Builds the DataTable column for one entry of the columns registry (see registries/columns.js). */
function toTableColumn(column, onCourseOpen) {
  const numeric = column.cell === 'number' || column.cell === 'percent';
  const tableColumn = {
    Header: column.label,
    id: column.id,
    accessor: column.id,
    cellClassName: numeric ? 'insights-cell-number' : undefined,
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

/**
 * The course table: Paragon DataTable showing the given rows (one page, already filtered, sorted and paged by the
 * caller) in the given columns. onCourseOpen(row) is called when a course link is clicked, for analytics.
 */
export default function CourseTable({ columns, rows, onCourseOpen }) {
  const tableColumns = useMemo(
    () => columns.map(column => toTableColumn(column, onCourseOpen)),
    [columns, onCourseOpen],
  );

  return (
    <div className="insights-course-table">
      <DataTable columns={tableColumns} data={rows} itemCount={rows.length}>
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
  onCourseOpen: PropTypes.func,
};

CourseTable.defaultProps = {
  onCourseOpen: () => {},
};
