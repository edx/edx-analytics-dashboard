import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import ParagonProvider from 'components/react/paragon/ParagonProvider';
import ignoreExpectedErrors from 'components/react/spec/ignore-expected-errors';
import {
  coursesFailed, coursesLoaded, coursesUnavailable,
} from 'course-list/react/state/courses-slice';
import createCourseListStore from 'course-list/react/state/store';
import CourseListPage from 'course-list/react/widgets/CourseListPage';

describe('CourseListPage', () => {
  let element;
  let root;
  let store;
  let restoreOnError;
  let onSectionError;

  const render = () => {
    act(() => {
      root.render(
        <Provider store={store}>
          <ParagonProvider><CourseListPage onSectionError={onSectionError} /></ParagonProvider>
        </Provider>,
      );
    });
  };
  const dispatch = (action) => {
    act(() => {
      store.dispatch(action);
    });
  };
  const placeholders = () => {
    const nodes = element.querySelectorAll('.insights-placeholder');
    return Array.prototype.map.call(nodes, node => node.textContent);
  };

  beforeEach(() => {
    restoreOnError = ignoreExpectedErrors(['Course data is not valid.']);
    // React logs errors that an error boundary caught to the console in development builds.
    spyOn(console, 'error');
    onSectionError = jasmine.createSpy('onSectionError');
    setFixtures('<div id="course-list-page-root"></div>');
    element = document.getElementById('course-list-page-root');
    root = createRoot(element);
    store = createCourseListStore();
  });

  afterEach(() => {
    act(() => root.unmount());
    restoreOnError();
  });

  it('has the Performance summary and Courses sections with their headings', () => {
    dispatch(coursesLoaded({ rows: [], programs: [] }));
    render();

    const headings = Array.prototype.map.call(element.querySelectorAll('section h2'), node => node.textContent);
    expect(headings).toEqual(['Performance summary', 'Courses']);
    const sections = element.querySelectorAll('section');
    expect(sections[0].getAttribute('aria-labelledby')).toBe('performance-summary-heading');
    expect(sections[1].getAttribute('aria-labelledby')).toBe('courses-heading');
    expect(document.getElementById('courses-heading').textContent).toBe('Courses');
  });

  it('has a placeholder for the summary, the controls and the results once the data is ready', () => {
    dispatch(coursesLoaded({ rows: [], programs: [] }));
    render();

    expect(placeholders().length).toBe(3);
    expect(placeholders()[0]).toContain('Summary cards');
    expect(placeholders()[1]).toContain('filters');
    expect(placeholders()[2]).toContain('table');
    expect(onSectionError).not.toHaveBeenCalled();
  });

  it('shows the loading state in the results while the data is loading', () => {
    render();

    expect(element.querySelector('.insights-loading-state')).not.toBeNull();
  });

  it('shows the legacy "no course data" message in the results when the data is unavailable', () => {
    dispatch(coursesUnavailable());
    render();

    expect(element.querySelector('.insights-empty-state-message').textContent)
      .toBe('No course data is currently available for your course.');
    expect(element.textContent).toContain('check back regularly for up-to-date metrics.');
  });

  it('shows the error state only in the section that fails, reports it, and keeps the other sections', () => {
    dispatch(coursesFailed());
    render();

    expect(element.querySelectorAll('.insights-error-state').length).toBe(1);
    expect(element.querySelector('.insights-error-state').textContent).toContain('Something went wrong loading this section.');
    expect(element.querySelectorAll('h2').length).toBe(2);
    expect(placeholders().length).toBe(2);
    expect(onSectionError).toHaveBeenCalledTimes(1);
    expect(onSectionError.calls.argsFor(0)[0]).toBe('course-list-results');
  });

  it('works without onSectionError', () => {
    dispatch(coursesFailed());
    act(() => {
      root.render(<Provider store={store}><ParagonProvider><CourseListPage /></ParagonProvider></Provider>);
    });

    expect(element.querySelectorAll('.insights-error-state').length).toBe(1);
  });
});
