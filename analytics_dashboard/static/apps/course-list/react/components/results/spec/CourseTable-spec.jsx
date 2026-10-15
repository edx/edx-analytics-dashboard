import { act } from 'react';
import { createRoot } from 'react-dom/client';

import ParagonProvider from 'components/react/paragon/ParagonProvider';
import CourseTable from 'course-list/react/components/results/CourseTable';

describe('CourseTable', () => {
  let element;
  let root;
  let onCourseOpen;

  const COLUMNS = [
    {
      id: 'catalog_course_title', label: 'Course Name', cell: 'courseName', hasData: true,
    },
    {
      id: 'start_date', label: 'Start Date', cell: 'date', hasData: true,
    },
    {
      id: 'count', label: 'Current Enrollment', cell: 'number', hasData: true,
    },
    {
      id: 'engagement_rate', label: 'Engagement Rate', cell: 'percent', hasData: true,
    },
    {
      id: 'sales_model', label: 'Sales Model', cell: 'text', hasData: true,
    },
    {
      id: 'b2b_count', label: 'B2B Enrollment', cell: 'number', hasData: false,
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

  const render = (columns = COLUMNS, rows = ROWS) => {
    act(() => {
      root.render(
        <ParagonProvider><CourseTable columns={columns} rows={rows} onCourseOpen={onCourseOpen} /></ParagonProvider>,
      );
    });
  };
  const headers = () => Array.prototype.map.call(element.querySelectorAll('thead th'), th => th.textContent.trim());
  const cells = index => Array.prototype.map.call(
    element.querySelectorAll('tbody tr')[index].querySelectorAll('td'),
    td => td,
  );

  beforeEach(() => {
    onCourseOpen = jasmine.createSpy('onCourseOpen');
    setFixtures('<div id="course-table-root"></div>');
    element = document.getElementById('course-table-root');
    root = createRoot(element);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('draws one header per column, in order, and one row per course run', () => {
    render();

    expect(headers()).toEqual([
      'Course Name', 'Start Date', 'Current Enrollment', 'Engagement Rate', 'Sales Model', 'B2B Enrollment',
    ]);
    expect(element.querySelectorAll('tbody tr').length).toBe(2);
    expect(element.querySelector('.insights-course-table .pgn__data-table')).not.toBeNull();
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
    expect(cells(1)[4].textContent).toBe('--');
  });

  it('shows "--" and "Data not available yet" in a pending column without data', () => {
    render();

    expect(cells(0)[5].querySelector('[aria-hidden="true"]').textContent).toBe('--');
    expect(cells(0)[5].querySelector('.sr-only').textContent).toBe('Data not available yet');
    expect(cells(0)[5].querySelector('[title]').getAttribute('title')).toBe('Data not available yet');
  });
});
