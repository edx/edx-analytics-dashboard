import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import ParagonProvider from 'components/react/paragon/ParagonProvider';
import ignoreExpectedErrors from 'components/react/spec/ignore-expected-errors';
import {
  coursesFailed, coursesLoaded, coursesUnavailable,
} from 'course-list/react/state/courses-slice';
import createCourseListStore from 'course-list/react/state/store';
import { summaryTextLoaded } from 'course-list/react/state/summary-slice';
import CourseListPage from 'course-list/react/widgets/CourseListPage';

describe('CourseListPage', () => {
  const TEXT = { total_enrollment: { label: 'Total Enrollment', tooltip: 'Help text.' } };
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
    restoreOnError = ignoreExpectedErrors(['Course data is not valid.', 'Summary text is not available.']);
    // React logs errors that an error boundary caught to the console in development builds.
    spyOn(console, 'error');
    onSectionError = jasmine.createSpy('onSectionError');
    setFixtures('<div id="course-list-page-root"></div>');
    element = document.getElementById('course-list-page-root');
    root = createRoot(element);
    store = createCourseListStore();
    store.dispatch(summaryTextLoaded(TEXT));
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

  it('has the summary card, the filter bar and a placeholder for the results, once the data is ready', () => {
    dispatch(coursesLoaded({ rows: [], programs: [] }));
    render();

    expect(element.querySelectorAll('.pgn__card').length).toBe(1);
    expect(element.querySelector('input[type="search"]')).not.toBeNull();
    expect(placeholders().length).toBe(1);
    expect(placeholders()[0]).toContain('table');
    expect(onSectionError).not.toHaveBeenCalled();
  });

  it('shows the total of the course rows in the summary card', () => {
    dispatch(coursesLoaded({ rows: [{ course_id: 'a', cumulative_count: 40 }, { course_id: 'b', cumulative_count: 2 }], programs: [] }));
    render();

    expect(element.querySelector('.insights-summary-number').textContent).toBe('42');
  });

  it('shows the error state only in the summary when the server sent no text for the cards', () => {
    dispatch(summaryTextLoaded({}));
    dispatch(coursesLoaded({ rows: [], programs: [] }));
    render();

    expect(element.querySelectorAll('.alert-error').length).toBe(1);
    expect(element.querySelector('.pgn__card')).toBeNull();
    expect(placeholders().length).toBe(1);
    expect(onSectionError).toHaveBeenCalledTimes(1);
    expect(onSectionError.calls.argsFor(0)[0]).toBe('course-list-summary');
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

  it('shows the error state in the sections that need the course data when it is malformed, and keeps the rest', () => {
    dispatch(coursesFailed());
    render();

    expect(element.querySelectorAll('.alert-error').length).toBe(2);
    expect(element.querySelector('.alert-error .alert-title').textContent).toBe('We are unable to load this section.');
    expect(element.querySelectorAll('h2').length).toBe(2);
    expect(element.querySelector('.pgn__card')).toBeNull();
    expect(placeholders().length).toBe(0);
    expect(onSectionError.calls.allArgs().map(args => args[0]))
      .toEqual(['course-list-summary', 'course-list-results']);
  });

  it('works without onSectionError', () => {
    dispatch(coursesFailed());
    act(() => {
      root.render(<Provider store={store}><ParagonProvider><CourseListPage /></ParagonProvider></Provider>);
    });

    expect(element.querySelectorAll('.alert-error').length).toBe(2);
  });
});
