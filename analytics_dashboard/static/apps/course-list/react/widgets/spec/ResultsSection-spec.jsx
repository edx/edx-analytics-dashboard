import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import ParagonProvider from 'components/react/paragon/ParagonProvider';
import { normalizeCourseRows } from 'course-list/react/platform/course-rows';
import { coursesLoaded } from 'course-list/react/state/courses-slice';
import { filterChanged, searchChanged } from 'course-list/react/state/query-slice';
import createCourseListStore from 'course-list/react/state/store';
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
  const headers = () => Array.prototype.map.call(element.querySelectorAll('thead th'), th => th.textContent.trim());
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
    };
    setFixtures('<div id="results-root"></div>');
    element = document.getElementById('results-root');
    root = createRoot(element);
    store = createCourseListStore();
    store.dispatch(coursesLoaded({ rows: normalizeCourseRows(fixture.rows, fixture.programs), programs: [] }));
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
      'Verified Enrollment', 'Passing Learners', 'Sales Model', 'Funding Model', 'B2B Enrollment',
      'B2C Enrollment', 'Subscription Enrollment', 'À la Carte Enrollment',
    ]);
  });

  it('leaves out Passing Learners when the enable_course_passing switch is off, and the link without a URL', () => {
    props.passingUsersEnabled = false;
    props.downloadUrl = '';
    render();

    expect(headers()).not.toContain('Passing Learners');
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
});
