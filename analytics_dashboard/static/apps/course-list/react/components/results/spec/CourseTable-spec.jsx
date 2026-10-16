import { act } from 'react';
import { createRoot } from 'react-dom/client';

import ParagonProvider from 'components/react/paragon/ParagonProvider';
import CourseTable from 'course-list/react/components/results/CourseTable';

describe('CourseTable', () => {
  let element;
  let root;
  let onCourseOpen;
  let onSortChange;

  const COLUMNS = [
    {
      id: 'catalog_course_title', label: 'Course Name', tooltip: 'Course name help.', cell: 'courseName', hasData: true,
    },
    {
      id: 'start_date', label: 'Start Date', tooltip: 'Start date help.', cell: 'date', hasData: true,
    },
    {
      id: 'count', label: 'Current Enrollment', tooltip: 'Current help.', cell: 'number', hasData: true,
    },
    {
      id: 'engagement_rate', label: 'Engagement Rate', tooltip: 'Rate help.', cell: 'percent', hasData: true,
    },
    {
      id: 'sales_model', label: 'Sales Model', tooltip: 'Sales help.', cell: 'text', hasData: true,
    },
    {
      id: 'b2b_count', label: 'B2B Enrollment', tooltip: 'B2B help.', cell: 'number', hasData: false,
    },
  ];
  const ROWS = [
    {
      course_id: 'course-v1:Edx+Algebra+2024',
      catalog_course_title: 'Algebra I',
      start_date: '2024-04-13T00:00:00Z',
      count: 1234,
      engagement_rate: 0.256,
      sales_model: 'B2C',
    },
    {
      course_id: 'course-v1:Edx+Biology+2023', catalog_course_title: 'Biology', start_date: '', count: -5,
    },
  ];
  const ASC = { key: 'catalog_course_title', dir: 'asc' };

  const render = (columns = COLUMNS, rows = ROWS, sort = ASC) => {
    act(() => {
      root.render(
        <ParagonProvider>
          <CourseTable
            columns={columns}
            rows={rows}
            itemCount={rows.length}
            sort={sort}
            onSortChange={onSortChange}
            onCourseOpen={onCourseOpen}
          />
        </ParagonProvider>,
      );
    });
  };
  // The text of a header: the label, without the hidden "click to sort" text and the icon.
  const headerLabel = (th) => {
    const control = th.querySelector('button, .insights-header-label');
    return control.childNodes[0].textContent.trim();
  };
  const headerCells = () => element.querySelectorAll('thead th');
  const headers = () => Array.prototype.map.call(headerCells(), headerLabel);
  const headerCell = label => Array.prototype.find.call(headerCells(), th => headerLabel(th) === label);
  const cells = index => element.querySelectorAll('tbody tr')[index].children;
  // PhantomJS has no MouseEvent constructor, so events are created the old way. They bubble, which is how React
  // receives them.
  const fire = (target, type) => {
    const event = document.createEvent('Event');
    event.initEvent(type, true, true);
    act(() => {
      target.dispatchEvent(event);
    });
  };
  // Only Paragon's tooltips: other specs can leave legacy Bootstrap 3 tooltips (.tooltip) in the body.
  const tooltips = () => document.querySelectorAll('.tooltip[class*="bs-tooltip-"]');

  beforeEach(() => {
    onCourseOpen = jasmine.createSpy('onCourseOpen');
    onSortChange = jasmine.createSpy('onSortChange');
    setFixtures('<div id="course-table-root"></div>');
    element = document.getElementById('course-table-root');
    root = createRoot(element);
  });

  afterEach(() => {
    act(() => root.unmount());
    Array.prototype.forEach.call(tooltips(), (tooltip) => {
      tooltip.parentNode.removeChild(tooltip);
    });
  });

  it('draws one header per column, in order, and one row per course run', () => {
    render();

    expect(headers()).toEqual([
      'Course Name', 'Start Date', 'Current Enrollment', 'Engagement Rate', 'Sales Model', 'B2B Enrollment',
    ]);
    expect(element.querySelectorAll('tbody tr').length).toBe(2);
    expect(element.querySelector('.insights-course-table table.insights-data-table')).not.toBeNull();
  });

  describe('for screen readers', () => {
    it('has a caption naming the table', () => {
      render();

      expect(element.querySelector('table > caption.sr-only').textContent).toBe('Course List');
    });

    it('makes Course Name the header of its row and every other cell a plain cell', () => {
      render();
      const row = cells(0);

      expect(row[0].tagName).toBe('TH');
      expect(row[0].getAttribute('scope')).toBe('row');
      expect(row[0].querySelector('a')).not.toBeNull();
      Array.prototype.slice.call(row, 1).forEach(cell => expect(cell.tagName).toBe('TD'));
      Array.prototype.forEach.call(headerCells(), th => expect(th.getAttribute('scope')).toBe('col'));
    });

    it('says which column is sorted with aria-sort, and has none on a column that cannot sort', () => {
      render(COLUMNS, ROWS, { key: 'count', dir: 'desc' });

      expect(headerCell('Current Enrollment').getAttribute('aria-sort')).toBe('descending');
      expect(headerCell('Course Name').getAttribute('aria-sort')).toBe('none');
      expect(headerCell('B2B Enrollment').hasAttribute('aria-sort')).toBe(false);

      render(COLUMNS, ROWS, { key: 'start_date', dir: 'asc' });
      expect(headerCell('Start Date').getAttribute('aria-sort')).toBe('ascending');
    });

    it('does not show the library\'s default "Toggle SortBy" tooltip', () => {
      render();

      Array.prototype.forEach.call(headerCells(), th => expect(th.hasAttribute('title')).toBe(false));
    });
  });

  describe('header tooltips', () => {
    // A tooltip fades out when it is hidden, so it can stay in the page a moment: the specs look for its text.
    const tooltipTexts = () => Array.prototype.map.call(tooltips(), tooltip => tooltip.textContent);

    it('shows the help text of a column when its header is hovered', () => {
      render();
      expect(tooltips().length).toBe(0);

      fire(headerCell('Current Enrollment').querySelector('button'), 'mouseover');

      expect(tooltipTexts()).toEqual(['Current help.']);
    });

    it('shows it when the header gets keyboard focus, also on a column that cannot sort', () => {
      render();
      fire(headerCell('Start Date').querySelector('button'), 'focusin');
      expect(tooltipTexts()).toContain('Start date help.');

      const label = headerCell('B2B Enrollment').querySelector('.insights-header-label');
      expect(label.getAttribute('tabindex')).toBe('0');
      fire(label, 'focusin');
      expect(tooltipTexts()).toContain('B2B help.');
    });
  });

  it('links the course name to the course, with the course ID under it, and reports the click', () => {
    render();
    const link = cells(0)[0].querySelector('a');

    expect(link.getAttribute('href')).toBe('/courses/course-v1:Edx+Algebra+2024');
    expect(link.querySelector('.insights-course-title').textContent).toBe('Algebra I');
    expect(link.querySelector('.insights-course-id').textContent).toBe('course-v1:Edx+Algebra+2024');

    act(() => {
      link.addEventListener('click', event => event.preventDefault());
      link.click();
    });
    expect(onCourseOpen).toHaveBeenCalledWith(ROWS[0]);
  });

  it('formats dates like the legacy table, and shows "--" with a reason for a missing date', () => {
    render();

    expect(cells(0)[1].textContent).toBe('04/13/2024');
    expect(cells(1)[1].querySelector('[aria-hidden="true"]').textContent).toBe('--');
    expect(cells(1)[1].querySelector('.sr-only').textContent).toBe('Date not available');
  });

  it('formats numbers with separators and right-aligned, percentages, and text', () => {
    render();

    expect(cells(0)[2].textContent).toBe('1,234');
    expect(cells(0)[2].className).toContain('insights-cell-number');
    expect(cells(1)[2].textContent).toBe('-5');
    expect(cells(0)[3].textContent).toBe('26%');
    expect(cells(0)[4].textContent).toBe('B2C');
    expect(cells(1)[4].textContent).toBe('--Not available');
    expect(cells(1)[4].querySelector('.sr-only').textContent).toBe('Not available');
  });

  it('shows "--" and "Data not available yet" in a pending column without data', () => {
    render();

    expect(cells(0)[5].querySelector('[aria-hidden="true"]').textContent).toBe('--');
    expect(cells(0)[5].querySelector('.sr-only').textContent).toBe('Data not available yet');
    expect(cells(0)[5].querySelector('[title]').getAttribute('title')).toBe('Data not available yet');
  });

  describe('sorting', () => {
    it('makes every header with data a button, with a hidden "click to sort" except on the sorted column', () => {
      render();

      expect(headerCell('Course Name').querySelector('button.insights-sort-button')).not.toBeNull();
      expect(headerCell('Course Name').querySelector('.sr-only')).toBeNull();
      expect(headerCell('Current Enrollment').querySelector('.sr-only').textContent).toBe(' click to sort');
      expect(headerCell('B2B Enrollment').querySelector('button')).toBeNull();
    });

    it('sorts a number column descending on the first click, and a text column ascending', () => {
      render();

      act(() => headerCell('Current Enrollment').querySelector('button').click());
      expect(onSortChange).toHaveBeenCalledWith('count', 'desc');

      act(() => headerCell('Start Date').querySelector('button').click());
      expect(onSortChange).toHaveBeenCalledWith('start_date', 'asc');
    });

    it('reverses the sorted column', () => {
      render();
      act(() => headerCell('Course Name').querySelector('button').click());
      expect(onSortChange).toHaveBeenCalledWith('catalog_course_title', 'desc');

      render(COLUMNS, ROWS, { key: 'catalog_course_title', dir: 'desc' });
      act(() => headerCell('Course Name').querySelector('button').click());
      expect(onSortChange).toHaveBeenCalledWith('catalog_course_title', 'asc');
    });

    it('does not sort a column without data: its header has no button and no sort handler', () => {
      render();
      const header = headerCell('B2B Enrollment');

      expect(header.querySelector('button')).toBeNull();
      act(() => header.click());
      expect(onSortChange).not.toHaveBeenCalled();
    });

    it('shows the sort it is given, without reporting it', () => {
      render(COLUMNS, ROWS, { key: 'count', dir: 'desc' });

      expect(headerCell('Current Enrollment').getAttribute('aria-sort')).toBe('descending');
      expect(onSortChange).not.toHaveBeenCalled();
    });

    it('follows a sort that changes from outside, and the next click builds on it', () => {
      render(COLUMNS, ROWS, { key: 'count', dir: 'desc' });
      render(COLUMNS, ROWS, { key: 'catalog_course_title', dir: 'asc' });

      expect(headerCell('Current Enrollment').getAttribute('aria-sort')).toBe('none');
      expect(headerCell('Course Name').getAttribute('aria-sort')).toBe('ascending');
      expect(onSortChange).not.toHaveBeenCalled();

      act(() => headerCell('Course Name').querySelector('button').click());
      expect(onSortChange.calls.allArgs()).toEqual([['catalog_course_title', 'desc']]);
    });
  });
});
