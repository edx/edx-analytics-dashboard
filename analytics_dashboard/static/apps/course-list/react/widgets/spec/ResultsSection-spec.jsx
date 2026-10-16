import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import ParagonProvider from 'components/react/paragon/ParagonProvider';
import { normalizeCourseRows } from 'course-list/react/platform/course-rows';
import { coursesLoaded, coursesUnavailable } from 'course-list/react/state/courses-slice';
import { filterChanged, searchChanged } from 'course-list/react/state/query-slice';
import createCourseListStore from 'course-list/react/state/store';
import { viewRestored } from 'course-list/react/state/view-slice';
import ResultsSection from 'course-list/react/widgets/ResultsSection';

const fixture = require('course-list/react/spec/fixtures/course-list-rows.json');

describe('ResultsSection', () => {
  let element;
  let root;
  let store;
  let props;

  const render = () => {
    act(() => {
      root.render(
        <Provider store={store}>
          <ParagonProvider><ResultsSection {...props} /></ParagonProvider>
        </Provider>,
      );
    });
  };
  const dispatch = (action) => {
    act(() => {
      store.dispatch(action);
    });
  };
  // The label of each header, without the hidden "click to sort" text and the sort icon.
  const headers = () => Array.prototype.map.call(
    element.querySelectorAll('thead th'),
    th => th.querySelector('button, .insights-header-label').childNodes[0].textContent.trim(),
  );
  const titles = () => Array.prototype.map.call(
    element.querySelectorAll('.insights-course-title'),
    node => node.textContent,
  );
  const downloadLink = () => element.querySelector('.insights-results-actions a');

  beforeEach(() => {
    props = {
      downloadUrl: '/courses/csv/',
      onDownload: jasmine.createSpy('onDownload'),
      passingUsersEnabled: true,
      filtersEnabled: true,
      onCourseOpen: jasmine.createSpy('onCourseOpen'),
      onSort: jasmine.createSpy('onSort'),
      onPage: jasmine.createSpy('onPage'),
      onColumnsChange: jasmine.createSpy('onColumnsChange'),
    };
    setFixtures('<div id="results-root"></div>');
    element = document.getElementById('results-root');
    root = createRoot(element);
    store = createCourseListStore();
    // Every course run has the fields of the pending columns, so the columns shown don't depend on
    // SHOW_PENDING_COLUMNS (a pending column without data is shown only while that setting is on).
    const rows = normalizeCourseRows(fixture.rows, fixture.programs).map(row => ({
      ...row,
      total_engagements: 5,
      engagement_rate: 0.5,
      sales_model: 'B2C',
      funding_model: 'Mixed',
      b2b_count: 0,
      b2c_count: 1,
      subscription_count: 0,
      alacarte_count: 1,
    }));
    store.dispatch(coursesLoaded({ rows, programs: [] }));
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('has the toolbar with the count and Download CSV, and the course table sorted by course name', () => {
    render();

    expect(element.querySelector('.insights-result-count').textContent).toBe('Course runs: 4');
    expect(element.querySelector('.insights-result-count').getAttribute('aria-live')).toBe('polite');
    expect(downloadLink().textContent).toBe('Download CSV');
    expect(downloadLink().getAttribute('href')).toBe('/courses/csv/');
    expect(titles()).toEqual(['Algebra I', 'Biology', 'Chemistry', 'drawing basics']);
  });

  it('shows the columns of the registry that start visible, the pending ones included', () => {
    render();

    expect(headers()).toEqual([
      'Course Name', 'Start Date', 'End Date', 'Total Enrollment', 'Current Enrollment', 'Change Last Week',
      'Verified Enrollment', 'Passing Learners', 'Program', 'Sales Model', 'Funding Model', 'B2B Enrollment',
      'B2C Enrollment', 'Subscription Enrollment', 'À la Carte Enrollment',
    ]);
  });

  it('shows the program titles of each course run', () => {
    render();
    const programIndex = headers().indexOf('Program');
    const programs = Array.prototype.map.call(
      element.querySelectorAll('tbody tr'),
      tr => tr.children[programIndex].textContent,
    );

    expect(programs).toEqual(['Program A, Program B', 'Program A', '--Not available', '--Not available']);
  });

  it('leaves out the columns whose switch is off, and the link without a URL', () => {
    props.passingUsersEnabled = false;
    props.filtersEnabled = false;
    props.downloadUrl = '';
    render();

    expect(headers()).not.toContain('Passing Learners');
    expect(headers()).not.toContain('Program');
    expect(downloadLink()).toBeNull();
  });

  it('follows the search and the filters, with the count', () => {
    render();
    dispatch(searchChanged('biology chemistry'));

    expect(titles()).toEqual(['Biology', 'Chemistry']);
    expect(element.querySelector('.insights-result-count').textContent).toBe('Course runs: 2');
  });

  it('shows the legacy message, with what to try, when the search and filters match nothing', () => {
    render();
    dispatch(searchChanged('nothing like this'));

    expect(element.querySelector('table')).toBeNull();
    expect(element.querySelector('.insights-empty-state-message').textContent)
      .toBe('No courses matched your criteria.');
    expect(element.textContent).toContain('Try a different search.');
    expect(element.textContent).not.toContain('Try clearing the filters.');

    dispatch(filterChanged({ id: 'availability', values: ['Upcoming'] }));
    expect(element.textContent).toContain('Try a different search. Try clearing the filters.');
  });

  it('reports a click on Download CSV and on a course link', () => {
    render();
    const course = element.querySelector('.insights-course-link');
    act(() => {
      [downloadLink(), course].forEach((link) => {
        link.addEventListener('click', event => event.preventDefault());
        link.click();
      });
    });

    expect(props.onDownload).toHaveBeenCalledTimes(1);
    expect(props.onCourseOpen.calls.argsFor(0)[0].course_id).toBe('course-v1:Edx+Algebra+2024');
  });

  describe('sorting and paging', () => {
    // 105 course runs: two pages.
    const many = Array.from({ length: 105 }, (value, index) => ({
      course_id: `course-v1:Edx+C${String(index).padStart(3, '0')}+2024`,
      catalog_course_title: `Course ${String(index).padStart(3, '0')}`,
      count: index,
    }));
    const button = text => Array.prototype.find.call(
      element.querySelectorAll('button'),
      node => node.textContent.trim() === text,
    );
    const header = label => Array.prototype.find.call(
      element.querySelectorAll('thead th button'),
      node => node.textContent.indexOf(label) === 0,
    );

    beforeEach(() => {
      store.dispatch(coursesLoaded({ rows: normalizeCourseRows(many), programs: [] }));
    });

    it('shows 100 course runs per page, with the pager, and moves to another page', () => {
      render();

      expect(element.querySelectorAll('tbody tr').length).toBe(100);
      act(() => element.querySelector('button[aria-label^="Next"]').click());

      expect(store.getState().query.page).toBe(2);
      expect(titles()).toEqual(['Course 100', 'Course 101', 'Course 102', 'Course 103', 'Course 104']);
      expect(props.onPage).toHaveBeenCalledWith(2);
      // Focus moves to the results, as the legacy pager does.
      expect(document.activeElement).toBe(element.querySelector('.insights-results-table'));
    });

    it('moves focus to the results after Previous and after Next onto the last page, where Paragon moves it itself', () => {
      render();
      act(() => element.querySelector('button[aria-label^="Next"]').click());
      expect(document.activeElement).toBe(element.querySelector('.insights-results-table'));

      element.querySelector('button[aria-label^="Previous"]').focus();
      act(() => element.querySelector('button[aria-label^="Previous"]').click());
      expect(store.getState().query.page).toBe(1);
      expect(document.activeElement).toBe(element.querySelector('.insights-results-table'));
    });

    it('sorts by a header click, starting again at the first page', () => {
      render();
      act(() => button('Last').click());
      act(() => header('Current Enrollment').click());

      expect(store.getState().query.sort).toEqual({ key: 'count', dir: 'desc' });
      expect(store.getState().query.page).toBe(1);
      expect(titles()[0]).toBe('Course 104');
      expect(props.onSort).toHaveBeenCalledWith('count', 'desc');
    });

    it('starts again at the first page after a new search', () => {
      render();
      act(() => Array.prototype.slice.call(element.querySelectorAll('.pagination button.page-link'), -1)[0].click());
      dispatch(searchChanged('course'));

      expect(store.getState().query.page).toBe(1);
      expect(titles()[0]).toBe('Course 000');
    });
  });

  describe('the Columns menu', () => {
    const toggle = () => element.querySelector('#columns-toggle');
    const boxes = () => element.querySelectorAll('.insights-checkbox-menu input[type="checkbox"]');
    // The text of a checkbox's Paragon wrapper (PhantomJS has no Element.closest).
    const labelOf = (input) => {
      let node = input;
      while (node && !/(^| )pgn__form-checkbox( |$)/.test(node.className)) {
        node = node.parentNode;
      }
      return node ? node.textContent.trim() : '';
    };
    const box = label => Array.prototype.find.call(boxes(), input => labelOf(input) === label);
    const open = () => act(() => toggle().click());

    it('lists every column but Course Name, the engagement ones unticked, without a count on the button', () => {
      render();
      open();

      expect(toggle().textContent.trim()).toBe('Columns');
      expect(boxes().length).toBe(16);
      expect(box('Course Name')).toBeUndefined();
      expect(box('Total Engagements').checked).toBe(false);
      expect(box('Start Date').checked).toBe(true);
    });

    it('hides and shows columns without changing the rows or the count, and reports each change', () => {
      render();
      open();
      act(() => box('Start Date').click());
      act(() => box('Total Engagements').click());

      expect(headers()).not.toContain('Start Date');
      expect(headers()).toContain('Total Engagements');
      expect(element.querySelector('thead th').getAttribute('aria-sort')).toBe('ascending');
      expect(element.querySelectorAll('tbody tr').length).toBe(4);
      expect(element.querySelector('.insights-result-count').textContent).toBe('Course runs: 4');
      expect(props.onColumnsChange.calls.allArgs()).toEqual([['start_date', false], ['total_engagements', true]]);
    });

    it('goes back to the default sort when the sorted column is hidden, so no hidden order is left', () => {
      render();
      const sortButton = label => Array.prototype.find.call(
        element.querySelectorAll('thead th button'),
        node => node.textContent.indexOf(label) === 0,
      );
      act(() => sortButton('Current Enrollment').click());
      expect(store.getState().query.sort).toEqual({ key: 'count', dir: 'desc' });

      open();
      act(() => box('Current Enrollment').click());

      expect(store.getState().query.sort).toEqual({ key: 'catalog_course_title', dir: 'asc' });
      expect(titles()).toEqual(['Algebra I', 'Biology', 'Chemistry', 'drawing basics']);
      expect(element.querySelector('thead th').getAttribute('aria-sort')).toBe('ascending');
      expect(headers()).not.toContain('Current Enrollment');
    });

    it('keeps the sort when another column is hidden', () => {
      render();
      const sortButton = Array.prototype.find.call(
        element.querySelectorAll('thead th button'),
        node => node.textContent.indexOf('Current Enrollment') === 0,
      );
      act(() => sortButton.click());
      open();
      act(() => box('Start Date').click());

      expect(store.getState().query.sort).toEqual({ key: 'count', dir: 'desc' });
    });
  });

  describe('states without results', () => {
    const toolbarLinks = () => element.querySelectorAll('.insights-results-actions a');

    it('keeps Download CSV while the data is loading or unavailable', () => {
      store = createCourseListStore();
      render();
      expect(element.querySelector('.insights-loading-state')).not.toBeNull();
      expect(toolbarLinks().length).toBe(1);

      dispatch(coursesUnavailable());
      expect(element.querySelector('.insights-empty-state-message').textContent)
        .toBe('No course data is currently available for your course.');
      expect(toolbarLinks().length).toBe(1);
    });

    it('has no toolbar in those states without a download URL', () => {
      store = createCourseListStore();
      props.downloadUrl = '';
      render();

      expect(element.querySelector('.insights-results-toolbar')).toBeNull();
    });

    it('says there is no course data, not that nothing matched, when there is no search and no filter', () => {
      dispatch(coursesLoaded({ rows: [], programs: [] }));
      render();

      expect(element.querySelector('.insights-empty-state-message').textContent)
        .toBe('No course data is currently available for your course.');
    });
  });

  describe('a value that is not what its column expects', () => {
    it('shows "--" for it and keeps the table, the count and the Columns menu', () => {
      const bad = normalizeCourseRows(fixture.rows).map(row => ({ ...row, count: 'abc' }));
      dispatch(coursesLoaded({ rows: bad.map((row, index) => ({ ...row, count: index ? 'abc' : '12' })), programs: [] }));
      render();
      const index = headers().indexOf('Current Enrollment');
      const cells = Array.prototype.map.call(
        element.querySelectorAll('tbody tr'),
        tr => tr.children[index].textContent,
      );

      expect(cells).toEqual(['12', '--Not available', '--Not available', '--Not available']);
      expect(element.querySelector('.insights-result-count').textContent).toBe('Course runs: 4');
      expect(element.querySelector('#columns-toggle')).not.toBeNull();
      expect(element.querySelector('.alert-error')).toBeNull();
    });
  });

  describe('an address with a parameter that can not be used', () => {
    it('shows the legacy "Invalid Parameters" message with its link, instead of the table', () => {
      dispatch(viewRestored({ visibleColumns: null, invalid: true }));
      render();

      expect(element.querySelector('table')).toBeNull();
      expect(element.querySelector('.alert-title').textContent).toBe('Invalid Parameters');
      expect(element.querySelector('.alert').textContent).toContain('Sorry, we couldn\'t find any courses that matched that query.');
      expect(element.querySelector('.alert a').getAttribute('href')).toBe('/courses/');
      expect(element.querySelector('.insights-results-toolbar')).not.toBeNull();
    });

    it('shows the table again once the address is valid', () => {
      dispatch(viewRestored({ visibleColumns: null, invalid: true }));
      render();
      dispatch(viewRestored({ visibleColumns: null, invalid: false }));

      expect(element.querySelector('.alert')).toBeNull();
      expect(element.querySelectorAll('tbody tr').length).toBe(4);
    });
  });
});
