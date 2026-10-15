import PropTypes from 'prop-types';
import { Button, Pagination } from '@openedx/paragon';

/**
 * The pager under the course table: First, Previous, the page numbers, Next and Last, as in the prototype and the
 * legacy table. Paragon's Pagination draws Previous / numbers / Next; DataTable's own pager has no First, Last or page
 * numbers. Hidden when everything fits on one page. onPageChange(page) gets a 1-based page.
 */
export default function TablePagination({ page, pageCount, onPageChange }) {
  if (pageCount < 2) {
    return null;
  }
  const go = (target) => {
    if (target !== page) {
      onPageChange(target);
    }
  };

  return (
    <nav className="insights-table-pagination" aria-label="Course runs pages">
      <Button variant="tertiary" size="sm" disabled={page === 1} onClick={() => go(1)}>First</Button>
      <Pagination
        paginationLabel="Course runs pagination"
        pageCount={pageCount}
        currentPage={page}
        onPageSelect={go}
        size="small"
      />
      <Button variant="tertiary" size="sm" disabled={page === pageCount} onClick={() => go(pageCount)}>Last</Button>
    </nav>
  );
}

TablePagination.propTypes = {
  page: PropTypes.number.isRequired,
  pageCount: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};
