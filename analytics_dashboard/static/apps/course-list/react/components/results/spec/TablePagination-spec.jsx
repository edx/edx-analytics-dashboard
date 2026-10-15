import { act } from 'react';
import { createRoot } from 'react-dom/client';

import ParagonProvider from 'components/react/paragon/ParagonProvider';
import TablePagination from 'course-list/react/components/results/TablePagination';

describe('TablePagination', () => {
  let element;
  let root;
  let onPageChange;

  const render = (page, pageCount) => {
    act(() => {
      root.render(
        <ParagonProvider>
          <TablePagination page={page} pageCount={pageCount} onPageChange={onPageChange} />
        </ParagonProvider>,
      );
    });
  };
  const button = text => Array.prototype.find.call(
    element.querySelectorAll('button'),
    node => node.textContent.trim() === text,
  );

  beforeEach(() => {
    onPageChange = jasmine.createSpy('onPageChange');
    setFixtures('<div id="pagination-root"></div>');
    element = document.getElementById('pagination-root');
    root = createRoot(element);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('is hidden when everything fits on one page', () => {
    render(1, 1);

    expect(element.querySelector('.insights-table-pagination')).toBeNull();
  });

  // Paragon shows the page numbers on wider screens and "Page x of y" on narrow ones (as in the test browser), so the
  // specs use the buttons that both have: Previous and Next, the first and last page links (Paragon 23 gives both the
  // class "previous").
  const pageLinks = () => element.querySelectorAll('.pagination button.page-link');
  const previous = () => pageLinks()[0];
  const next = () => pageLinks()[pageLinks().length - 1];

  it('has First, Previous, Next and Last, with First and Previous disabled on the first page', () => {
    render(1, 3);

    expect(button('First').disabled).toBe(true);
    expect(previous().disabled).toBe(true);
    expect(next().disabled).toBe(false);
    expect(button('Last').disabled).toBe(false);
  });

  it('reports the chosen page: Next, Previous, Last and First', () => {
    render(2, 5);

    act(() => next().click());
    act(() => previous().click());
    act(() => button('Last').click());
    act(() => button('First').click());

    expect(onPageChange.calls.allArgs()).toEqual([[3], [1], [5], [1]]);
  });

  it('shows the page it is given', () => {
    render(1, 5);
    render(5, 5);

    expect(button('Last').disabled).toBe(true);
    expect(button('First').disabled).toBe(false);
  });
});
