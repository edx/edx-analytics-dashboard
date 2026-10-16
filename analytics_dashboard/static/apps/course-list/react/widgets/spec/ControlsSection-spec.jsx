import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import ParagonProvider from 'components/react/paragon/ParagonProvider';
import { today } from 'course-list/react/components/controls/TimeframeDropdown';
import { coursesLoaded } from 'course-list/react/state/courses-slice';
import { filterChanged } from 'course-list/react/state/query-slice';
import createCourseListStore from 'course-list/react/state/store';
import ControlsSection from 'course-list/react/widgets/ControlsSection';

describe('ControlsSection', () => {
  let element;
  let root;
  let store;
  let props;

  const render = () => {
    act(() => {
      root.render(
        <Provider store={store}>
          <ParagonProvider><ControlsSection {...props} /></ParagonProvider>
        </Provider>,
      );
    });
  };
  const searchInput = () => element.querySelector('input[type="search"]');
  const toggle = () => element.querySelector('#availability-toggle');
  const toggleLabels = () => Array.from(element.querySelectorAll('.dropdown-toggle')).map(item => item.textContent);
  const checkboxes = () => element.querySelectorAll('input[type="checkbox"]');
  // PhantomJS has no Event constructor, so events are created the old way.
  const fire = (target, type) => {
    const event = document.createEvent('Event');
    event.initEvent(type, true, true);
    target.dispatchEvent(event);
  };
  const type = (text) => {
    act(() => {
      searchInput().value = text;
      fire(searchInput(), 'input');
    });
  };

  beforeEach(() => {
    props = {
      filtersEnabled: true,
      onSearch: jasmine.createSpy('onSearch'),
      onFilter: jasmine.createSpy('onFilter'),
    };
    setFixtures('<div id="controls-root"></div>');
    element = document.getElementById('controls-root');
    root = createRoot(element);
    store = createCourseListStore();
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('has the search box and the filters, and no Download CSV link (it is in the results toolbar)', () => {
    render();

    expect(searchInput().getAttribute('aria-label')).toBe('Find a course');
    expect(toggle().textContent).toBe('Availability');
    expect(element.querySelector('a')).toBeNull();
  });

  const loadCourses = () => act(() => {
    store.dispatch(coursesLoaded({
      rows: [
        { course_id: 'run-1', catalog_course: 'edX+Bio', catalog_course_title: 'Biology' },
        { course_id: 'run-2', catalog_course: 'edX+Alg', catalog_course_title: 'Algebra I' },
      ],
      programs: [{ program_id: 'program-a', program_title: 'Program A', course_ids: ['run-1'] }],
    }));
  });

  it('shows Sales Model and Funding Model before their data comes only when told to (in the preview)', () => {
    render();
    expect(toggleLabels()).toEqual(['Availability', 'Pacing']);

    props.pendingFiltersShown = true;
    render();
    expect(toggleLabels()).toEqual(['Sales Model', 'Funding Model', 'Availability', 'Pacing']);
  });

  it('has the Program and Course filters, before Availability and Pacing, only when the page has their data', () => {
    props.pendingFiltersShown = true;
    render();
    expect(toggleLabels()).toEqual(['Sales Model', 'Funding Model', 'Availability', 'Pacing']);

    loadCourses();
    expect(toggleLabels())
      .toEqual(['Program', 'Course', 'Sales Model', 'Funding Model', 'Availability', 'Pacing']);

    act(() => element.querySelector('#program_ids-toggle').click());
    act(() => checkboxes()[0].click());
    expect(store.getState().query.filters).toEqual({ program_ids: ['program-a'] });
    expect(props.onFilter.calls.mostRecent().args[0]).toEqual(['program-a']);
  });

  it('narrows the options of a searchable filter to the ones with the typed text, and empties it on close', () => {
    render();
    loadCourses();
    act(() => element.querySelector('#courses-toggle').click());
    const menuSearch = () => element.querySelector('.insights-checkbox-menu input[type="search"]');
    const typeInMenu = (text) => {
      act(() => {
        menuSearch().value = text;
        fire(menuSearch(), 'input');
      });
    };
    const labels = () => Array.from(checkboxes()).map(item => item.parentNode.textContent.trim());

    expect(menuSearch().getAttribute('aria-label')).toBe('Filter courses');
    expect(menuSearch().getAttribute('placeholder')).toBe('Filter courses');
    expect(labels()).toEqual(['Algebra I', 'Biology']);
    // The full name stays readable on hover when a long one is cut off.
    expect(Array.from(element.querySelectorAll('.insights-checkbox-menu label [title]'))
      .map(item => item.getAttribute('title'))).toEqual(['Algebra I', 'Biology']);

    typeInMenu('BIO');
    expect(labels()).toEqual(['Biology']);
    act(() => checkboxes()[0].click());
    expect(store.getState().query.filters).toEqual({ courses: ['edX+Bio'] });

    typeInMenu('nothing like it');
    expect(checkboxes().length).toBe(0);
    expect(element.querySelector('.insights-checkbox-menu .insights-menu-note').textContent).toBe('No matches');

    act(() => element.querySelector('#courses-toggle').click());
    act(() => element.querySelector('#courses-toggle').click());
    expect(menuSearch().value).toBe('');
  });

  it('keeps listing a selected value the options no longer have, so it can be unticked', () => {
    render();
    loadCourses();
    act(() => store.dispatch(filterChanged({ id: 'courses', values: ['edX+Gone'] })));
    act(() => element.querySelector('#courses-toggle').click());

    const gone = Array.from(checkboxes()).find(item => item.parentNode.textContent.trim() === 'edX+Gone');
    expect(gone.checked).toBe(true);
    act(() => gone.click());
    expect(store.getState().query.filters).toEqual({});
  });

  it('keeps a filter with a selection shown when its options are gone', () => {
    render();
    act(() => store.dispatch(filterChanged({ id: 'program_ids', values: ['program-gone'] })));

    expect(toggleLabels()).toEqual(['Program (1)', 'Availability', 'Pacing']);
  });

  it('cuts a long list at 50, the selected options first, and says how many there are', () => {
    render();
    const many = Array.from({ length: 60 }, (value, index) => ({
      course_id: `run-${index}`, catalog_course: `edX+C${index}`, catalog_course_title: `Course ${100 + index}`,
    }));
    act(() => store.dispatch(coursesLoaded({ rows: many, programs: [] })));
    act(() => store.dispatch(filterChanged({ id: 'courses', values: ['edX+C59'] })));
    act(() => element.querySelector('#courses-toggle').click());

    expect(checkboxes().length).toBe(50);
    expect(checkboxes()[0].parentNode.textContent.trim()).toBe('Course 159');
    expect(checkboxes()[0].checked).toBe(true);
    expect(element.querySelector('.insights-checkbox-menu .insights-menu-note').textContent).toBe('Showing 50 of 60');
  });

  it('doesn\'t move an option of a long list ticked while the menu is open', () => {
    render();
    const many = Array.from({ length: 60 }, (value, index) => ({
      course_id: `run-${index}`, catalog_course: `edX+C${index}`, catalog_course_title: `Course ${100 + index}`,
    }));
    act(() => store.dispatch(coursesLoaded({ rows: many, programs: [] })));
    act(() => element.querySelector('#courses-toggle').click());
    const labelAt = index => checkboxes()[index].parentNode.textContent.trim();

    expect(labelAt(5)).toBe('Course 105');
    act(() => checkboxes()[5].click());
    act(() => checkboxes()[6].click());

    expect(labelAt(5)).toBe('Course 105');
    expect(labelAt(6)).toBe('Course 106');
    expect(store.getState().query.filters).toEqual({ courses: ['edX+C5', 'edX+C6'] });
  });

  it('ties each label to its checkbox with an id Paragon makes, whatever characters the value has', () => {
    render();
    act(() => store.dispatch(coursesLoaded({
      rows: [{ course_id: 'run-1', catalog_course: 'edX Two Words', catalog_course_title: 'Two Words' }], programs: [],
    })));
    act(() => element.querySelector('#courses-toggle').click());

    const input = checkboxes()[0];
    const label = element.querySelector(`label[for="${input.id}"]`);
    expect(input.id).not.toContain(' ');
    expect(label.textContent).toBe('Two Words');
  });

  it('has no search box in the short lists', () => {
    render();
    act(() => toggle().click());

    expect(element.querySelector('.insights-checkbox-menu input[type="search"]')).toBeNull();
  });

  it('has no filters when the server did not enable them', () => {
    props.filtersEnabled = false;
    render();

    expect(searchInput()).not.toBeNull();
    expect(toggle()).toBeNull();
  });

  describe('the Timeframe menu', () => {
    it('takes today in the user\'s time zone, not UTC', () => {
      expect(today(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
      expect(today(new Date(2026, 11, 31, 0, 15))).toBe('2026-12-31');
    });

    const timeframeToggle = () => element.querySelector('#timeframe-toggle');
    const radios = () => element.querySelectorAll('.insights-timeframe-menu input[type="radio"]');
    const dates = () => element.querySelectorAll('.insights-timeframe-menu input[type="date"]');

    it('is shown only when enabled, after the search box', () => {
      render();
      expect(timeframeToggle()).toBeNull();

      props.timeframeEnabled = true;
      render();
      expect(toggleLabels()[0]).toBe('Timeframe');
    });

    it('stores the chosen range, with From and To dates for Custom', () => {
      props.timeframeEnabled = true;
      render();
      act(() => timeframeToggle().click());

      expect(Array.from(radios()).map(item => item.parentNode.textContent.trim()))
        .toEqual(['All Time', 'Last 7 days', 'Last 30 days', 'Last 60 days', 'Custom']);
      expect(radios()[0].checked).toBe(true);
      expect(element.querySelector('.insights-timeframe-menu .insights-menu-note')).toBeNull();
      expect(dates().length).toBe(0);

      act(() => radios()[2].click());
      expect(store.getState().query.timeframe).toEqual({ range: '30d', from: '', to: '' });

      act(() => radios()[4].click());
      expect(store.getState().query.timeframe.range).toBe('custom');
      expect(dates().length).toBe(2);
      act(() => {
        dates()[0].value = '2026-01-01';
        fire(dates()[0], 'input');
      });
      expect(store.getState().query.timeframe).toEqual({ range: 'custom', from: '2026-01-01', to: '' });
      expect(dates()[1].getAttribute('min')).toBe('2026-01-01');

      // A typed date that contradicts the other one wins once the field is left, and clears the other. While a year
      // is typed, the browser reports each digit as a whole date: nothing is cleared then.
      const typeDate = (index, date) => act(() => {
        dates()[index].value = date;
        fire(dates()[index], 'input');
      });
      const leave = index => act(() => fire(dates()[index], 'focusout'));
      ['0002-03-01', '0020-03-01', '0202-03-01', '2026-03-01'].forEach(date => typeDate(1, date));
      expect(store.getState().query.timeframe).toEqual({ range: 'custom', from: '2026-01-01', to: '2026-03-01' });
      leave(1);
      expect(store.getState().query.timeframe).toEqual({ range: 'custom', from: '2026-01-01', to: '2026-03-01' });

      typeDate(0, '2026-04-01');
      expect(store.getState().query.timeframe.to).toBe('2026-03-01');
      leave(0);
      expect(store.getState().query.timeframe).toEqual({ range: 'custom', from: '2026-04-01', to: '' });

      typeDate(1, '2026-02-01');
      leave(1);
      expect(store.getState().query.timeframe).toEqual({ range: 'custom', from: '', to: '2026-02-01' });
    });
  });

  it('has a button that clears the search once there is text', () => {
    render();
    const clear = () => element.querySelector('button[aria-label="Clear search"]');
    expect(clear()).toBeNull();

    type('algebra');
    act(() => clear().click());

    expect(store.getState().query.search).toBe('');
    expect(searchInput().value).toBe('');
    expect(clear()).toBeNull();
    // The button is gone, so the focus goes back to the box rather than to the page.
    expect(document.activeElement).toBe(searchInput());
  });

  it('is the only search landmark, also with a searchable menu open', () => {
    render();
    loadCourses();
    act(() => element.querySelector('#courses-toggle').click());

    expect(element.querySelectorAll('[role="search"]').length).toBe(1);
    expect(element.querySelector('[role="search"] input').getAttribute('aria-label')).toBe('Find a course');
  });

  it('stores the search text as it is typed, and reports a search when Enter is pressed', () => {
    render();
    type('algebra');

    expect(store.getState().query.search).toBe('algebra');
    expect(searchInput().value).toBe('algebra');
    expect(props.onSearch).not.toHaveBeenCalled();

    act(() => fire(element.querySelector('form'), 'submit'));
    expect(props.onSearch).toHaveBeenCalledWith('algebra');
  });

  it('stores the selected values of a filter and reports them, and shows how many are selected', () => {
    render();
    act(() => toggle().click());
    expect(checkboxes().length).toBe(4);

    act(() => checkboxes()[1].click());
    act(() => checkboxes()[0].click());

    expect(store.getState().query.filters).toEqual({ availability: ['Archived', 'Current'] });
    expect(props.onFilter.calls.mostRecent().args[0]).toEqual(['Archived', 'Current']);
    expect(toggle().textContent).toBe('Availability (2)');

    act(() => checkboxes()[0].click());
    expect(store.getState().query.filters).toEqual({ availability: ['Current'] });
  });
});
