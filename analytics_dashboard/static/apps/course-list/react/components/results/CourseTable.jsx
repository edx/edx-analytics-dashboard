import { useContext, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  DataTable, DataTableContext, Icon, OverlayTrigger, Tooltip,
} from '@openedx/paragon';
import { ArrowDropDown, ArrowDropUp, ArrowDropUpDown } from '@openedx/paragon/icons';

import {
  formatCount, formatDate, formatPercent,
} from 'course-list/react/platform/format';
import { isEmpty, isNumericCell, toNumber } from 'course-list/react/state/values';

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

// The cells. The table body renders them with react-table's cell props; column is the column built below.
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
  // A number column shows a number: a value that isn't one (for example text the server sent by mistake) is "--".
  const shown = isNumericCell(column.cellType) ? toNumber(value) : value;
  if (isEmpty(shown)) {
    return <Missing reason="Not available" />;
  }
  const text = column.format(shown);
  // Text can be long (program titles): the full text is also a tooltip.
  return column.cellType === 'text' ? <span title={text}>{text}</span> : text;
}

ValueCell.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  column: PropTypes.shape({ format: PropTypes.func, cellType: PropTypes.string }).isRequired,
};

ValueCell.defaultProps = { value: null };

const FORMATS = { number: formatCount, percent: formatPercent, text: String };

/** Builds the table column for one entry of the columns registry (see registries/columns.js). */
function toTableColumn(column, onCourseOpen) {
  const numeric = isNumericCell(column.cell);
  const tableColumn = {
    Header: column.label,
    label: column.label,
    tooltip: column.tooltip,
    id: column.id,
    accessor: column.id,
    numeric,
    // A column without data can't be sorted.
    sortable: column.hasData,
    cellKind: column.cell,
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
  return {
    ...tableColumn, Cell: ValueCell, format: FORMATS[column.cell] || String, cellType: column.cell,
  };
}

// The sort a click on a column's header asks for: the sorted column reverses; another column starts with its first
// direction (numbers descending, the others ascending).
function nextSort(column, sort) {
  if (sort.key === column.id) {
    return sort.dir === 'asc' ? 'desc' : 'asc';
  }
  return column.numeric ? 'desc' : 'asc';
}

function SortIcon({ sorted, dir }) {
  if (!sorted) {
    return <Icon src={ArrowDropUpDown} className="insights-sort-icon insights-sort-icon-idle" />;
  }
  return <Icon src={dir === 'desc' ? ArrowDropDown : ArrowDropUp} className="insights-sort-icon" />;
}

SortIcon.propTypes = {
  sorted: PropTypes.bool.isRequired,
  dir: PropTypes.string.isRequired,
};

// A header cell: the label with its help tooltip (on hover and on keyboard focus), as a button when the column sorts.
function HeaderCell({ column, sort, onSortChange }) {
  const sorted = column.sortable && sort.key === column.id;
  let ariaSort;
  if (column.sortable) {
    ariaSort = 'none';
    if (sorted) {
      ariaSort = sort.dir === 'desc' ? 'descending' : 'ascending';
    }
  }
  const tooltip = <Tooltip id={`course-table-tooltip-${column.id}`}>{column.tooltip}</Tooltip>;
  const trigger = column.sortable ? (
    <button
      type="button"
      className="insights-sort-button"
      onClick={() => onSortChange(column.id, nextSort(column, sort))}
    >
      {column.label}
      <SortIcon sorted={sorted} dir={sort.dir} />
      {!sorted && <span className="sr-only"> click to sort</span>}
    </button>
  ) : (
    // Without a button the label still has to be reachable by keyboard, so its tooltip can be read.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <span className="insights-header-label" tabIndex={0}>{column.label}</span>
  );

  return (
    <th scope="col" aria-sort={ariaSort} className={column.numeric ? 'insights-cell-number' : undefined}>
      <OverlayTrigger placement="top" trigger={['hover', 'focus']} overlay={tooltip}>
        {trigger}
      </OverlayTrigger>
    </th>
  );
}

HeaderCell.propTypes = {
  column: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    tooltip: PropTypes.string,
    numeric: PropTypes.bool,
    sortable: PropTypes.bool,
  }).isRequired,
  sort: PropTypes.shape({ key: PropTypes.string, dir: PropTypes.string }).isRequired,
  onSortChange: PropTypes.func.isRequired,
};

/**
 * The table markup, drawn from the state DataTable gives it. DataTable's own table can't mark Course Name as the row
 * header, name the table or say which column is sorted (aria-sort), which the legacy table did for screen readers.
 */
function TableBody({ sort, onSortChange }) {
  const {
    getTableProps, getTableBodyProps, prepareRow, rows, headerGroups,
  } = useContext(DataTableContext);
  const { headers } = headerGroups[0];

  return (
    <div className="insights-table-scroll">
      <table {...getTableProps({ className: 'insights-data-table', role: undefined })}>
        <caption className="sr-only">Course List</caption>
        <thead>
          <tr>
            {headers.map(column => (
              <HeaderCell key={column.id} column={column} sort={sort} onSortChange={onSortChange} />
            ))}
          </tr>
        </thead>
        <tbody {...getTableBodyProps({ role: undefined })}>
          {rows.map((row) => {
            prepareRow(row);
            const { key: rowKey } = row.getRowProps();
            return (
              <tr key={rowKey}>
                {row.cells.map((cell) => {
                  const { key: cellKey } = cell.getCellProps();
                  const className = cell.column.cellClassName;
                  return cell.column.cellKind === 'courseName' ? (
                    <th key={cellKey} scope="row" className={className}>{cell.render('Cell')}</th>
                  ) : (
                    <td key={cellKey} className={className}>{cell.render('Cell')}</td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

TableBody.propTypes = {
  sort: PropTypes.shape({ key: PropTypes.string, dir: PropTypes.string }).isRequired,
  onSortChange: PropTypes.func.isRequired,
};

/**
 * The course table: Paragon DataTable, which holds the columns and the rows, with the markup drawn by TableBody. It
 * shows the given rows (one page, already filtered, sorted and paged by the caller) in the given columns, and has no
 * sort of its own: it shows the `sort` it is given, and a header click calls onSortChange(key, dir) so the caller
 * sorts and passes the new rows (and the new `sort`). onCourseOpen(row) is called when a course link is clicked, for
 * analytics.
 */
export default function CourseTable({
  columns, rows, itemCount, sort, onSortChange, onCourseOpen,
}) {
  const tableColumns = useMemo(
    () => columns.map(column => toTableColumn(column, onCourseOpen)),
    [columns, onCourseOpen],
  );

  return (
    <div className="insights-course-table">
      <DataTable columns={tableColumns} data={rows} itemCount={itemCount}>
        <TableBody sort={sort} onSortChange={onSortChange} />
      </DataTable>
    </div>
  );
}

CourseTable.propTypes = {
  // Entries of the columns registry, with hasData (see selectAvailableColumns).
  columns: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    tooltip: PropTypes.string.isRequired,
    cell: PropTypes.string.isRequired,
    hasData: PropTypes.bool.isRequired,
  })).isRequired,
  rows: PropTypes.arrayOf(PropTypes.shape({
    course_id: PropTypes.string.isRequired,
  })).isRequired,
  // The number of course runs in all pages.
  itemCount: PropTypes.number.isRequired,
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
