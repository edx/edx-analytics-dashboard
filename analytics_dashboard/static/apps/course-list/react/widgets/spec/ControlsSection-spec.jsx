import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import ParagonProvider from 'components/react/paragon/ParagonProvider';
import { today } from 'course-list/react/components/controls/TimeframeDropdown';
import { formatDate } from 'course-list/react/platform/format';
import { coursesLoaded } from 'course-list/react/state/courses-slice';
import { filterChanged, searchChanged, timeframeChanged } from 'course-list/react/state/query-slice';
import createCourseListStore from 'course-list/react/state/store';
import ControlsSection, { appliedFilterChips } from 'course-list/react/widgets/ControlsSection';

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

  describe('the applied filters', () => {
    const chipsRow = () => element.querySelector('.insights-applied-filters');
    const removeButtons = () => Array.from(element.querySelectorAll('.insights-applied-filters .insights-applied-filter'));
    const chipTexts = () => removeButtons().map(item => item.textContent);
    const removeButton = name => removeButtons().find(item => item.getAttribute('aria-label') === name);
    const clearLink = () => element.querySelector('.insights-applied-filters-clear');
    const select = (id, values) => act(() => store.dispatch(filterChanged({ id, values })));

    beforeEach(() => {
      props.timeframeEnabled = true;
      props.pendingFiltersShown = true;
    });

    it('has no chips row when no filter is applied', () => {
      render();
      loadCourses();

      expect(chipsRow()).toBeNull();
    });

    it('shows a chip for the timeframe, with a remove button named after it', () => {
      render();
      act(() => store.dispatch(timeframeChanged({ range: '7d' })));

      expect(chipTexts()).toEqual(['Timeframe: Last 7 days']);
      expect(removeButtons()[0].getAttribute('title')).toBe('Timeframe: Last 7 days');
      expect(removeButtons()[0].tagName).toBe('BUTTON');
      // The chip is the bar's default button, as in the prototype, with a ✖ after the text.
      expect(removeButtons()[0].classList).toContain('insights-default-button');
      expect(removeButtons()[0].querySelector('.btn-icon-after')).not.toBeNull();
      expect(removeButtons()[0].getAttribute('aria-label')).toBe('Remove filter Timeframe: Last 7 days');
      expect(chipsRow().getAttribute('aria-label')).toBe('Applied filters');
    });

    it('shows Custom by its dates as the table formats dates (MM/DD/YYYY), and no chip while it has none', () => {
      const [year, month, day] = today().split('-');
      render();
      act(() => store.dispatch(timeframeChanged({ range: 'custom', from: '2026-10-06', to: '2026-10-30' })));
      expect(chipTexts()).toEqual(['Timeframe: 10/06/2026 to 10/30/2026']);
      expect(chipTexts()[0]).toContain(formatDate('2026-10-06'));

      act(() => store.dispatch(timeframeChanged({ range: 'custom', from: '2026-01-01', to: '2026-02-01' })));
      expect(chipTexts()).toEqual(['Timeframe: 01/01/2026 to 02/01/2026']);

      act(() => store.dispatch(timeframeChanged({ range: 'custom', from: '2026-01-01' })));
      expect(chipTexts()).toEqual([`Timeframe: 01/01/2026 to ${month}/${day}/${year}`]);

      act(() => store.dispatch(timeframeChanged({ range: 'custom', to: '2026-02-01' })));
      expect(chipTexts()).toEqual(['Timeframe: -- to 02/01/2026']);

      act(() => store.dispatch(timeframeChanged({ range: 'custom' })));
      expect(chipsRow()).toBeNull();
    });

    it('shows one chip per filter in the bar\'s order, with the labels of its values', () => {
      render();
      loadCourses();
      select('pacing_type', ['self_paced']);
      select('availability', ['Archived', 'Current']);
      select('funding', ['subscription']);
      select('sales', ['b2b', 'b2c']);
      select('courses', ['edX+Bio']);
      select('program_ids', ['program-a']);
      act(() => store.dispatch(timeframeChanged({ range: '30d' })));

      expect(chipTexts()).toEqual([
        'Timeframe: Last 30 days',
        'Program: Program A',
        'Course: Biology',
        'Sales Model: B2B, B2C',
        'Funding Model: Subscription',
        'Availability: Archived, Current',
        'Pacing: Self-Paced',
      ]);
    });

    it('updates the chips as soon as a filter is changed from its dropdown', () => {
      render();
      act(() => toggle().click());
      act(() => checkboxes()[1].click());
      expect(chipTexts()).toEqual(['Availability: Current']);

      act(() => checkboxes()[0].click());
      expect(chipTexts()).toEqual(['Availability: Archived, Current']);

      act(() => checkboxes()[0].click());
      act(() => checkboxes()[1].click());
      expect(chipsRow()).toBeNull();
    });

    it('removes only the filter of a chip, resets its dropdown, reports it, and moves the focus to the next chip', () => {
      render();
      loadCourses();
      select('program_ids', ['program-a']);
      select('availability', ['Current']);
      select('pacing_type', ['self_paced']);
      expect(element.querySelector('#availability-toggle').textContent).toBe('Availability (1)');

      act(() => removeButton('Remove filter Availability: Current').click());

      expect(store.getState().query.filters).toEqual({ program_ids: ['program-a'], pacing_type: ['self_paced'] });
      expect(element.querySelector('#availability-toggle').textContent).toBe('Availability');
      expect(chipTexts()).toEqual(['Program: Program A', 'Pacing: Self-Paced']);
      expect(props.onFilter.calls.mostRecent().args[0]).toEqual([]);
      expect(document.activeElement).toBe(removeButton('Remove filter Pacing: Self-Paced'));

      // The last chip removed: the focus goes to the one before it.
      act(() => removeButton('Remove filter Pacing: Self-Paced').click());
      expect(document.activeElement).toBe(removeButton('Remove filter Program: Program A'));
    });

    it('moves no focus when a chip or Clear is clicked with the mouse, so nothing gets a focus outline', () => {
      // A mouse click counts one click (detail 1); Enter or Space on a button counts none, as .click() above does.
      const mouseClick = (target) => {
        const event = document.createEvent('MouseEvents');
        event.initMouseEvent('click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
        act(() => target.dispatchEvent(event));
      };
      render();
      loadCourses();
      select('availability', ['Current']);
      select('pacing_type', ['self_paced']);

      mouseClick(removeButton('Remove filter Availability: Current'));
      expect(chipTexts()).toEqual(['Pacing: Self-Paced']);
      expect(document.activeElement).not.toBe(removeButton('Remove filter Pacing: Self-Paced'));

      mouseClick(clearLink());
      expect(chipsRow()).toBeNull();
      expect(document.activeElement).not.toBe(searchInput());
    });

    it('puts the timeframe back to All Time when its chip is removed', () => {
      render();
      act(() => store.dispatch(timeframeChanged({ range: 'custom', from: '2026-01-01', to: '2026-02-01' })));

      act(() => removeButtons()[0].click());

      expect(store.getState().query.timeframe).toEqual({ range: 'all', from: '', to: '' });
      expect(chipsRow()).toBeNull();
      expect(props.onFilter).not.toHaveBeenCalled();
      // No chip is left: the focus goes back to the search box.
      expect(document.activeElement).toBe(searchInput());
    });

    it('removes every filter and the timeframe with Clear, keeps the search, and focuses the search box', () => {
      render();
      loadCourses();
      act(() => store.dispatch(searchChanged('bio')));
      select('availability', ['Current']);
      select('courses', ['edX+Bio']);
      act(() => store.dispatch(timeframeChanged({ range: '60d' })));

      expect(clearLink().textContent).toBe('Clear');
      expect(clearLink().getAttribute('aria-label')).toBe('Clear all filters');
      act(() => clearLink().click());

      expect(store.getState().query.filters).toEqual({});
      expect(store.getState().query.timeframe.range).toBe('all');
      expect(store.getState().query.search).toBe('bio');
      expect(chipsRow()).toBeNull();
      expect(props.onFilter.calls.count()).toBe(1);
      expect(props.onFilter).toHaveBeenCalledWith([]);
      expect(document.activeElement).toBe(searchInput());
    });

    it('has a chip for a selection in a filter the bar doesn\'t show, so it can be removed', () => {
      props.pendingFiltersShown = false;
      render();
      select('sales', ['b2b']);

      expect(toggleLabels()).not.toContain('Sales Model');
      expect(chipTexts()).toEqual(['Sales Model: B2B']);
    });

    it('has no Timeframe chip while its menu isn\'t shown, and no chips when the filters aren\'t enabled', () => {
      props.timeframeEnabled = false;
      render();
      act(() => store.dispatch(timeframeChanged({ range: '7d' })));
      expect(chipsRow()).toBeNull();

      props.filtersEnabled = false;
      render();
      select('availability', ['Current']);
      expect(chipsRow()).toBeNull();
    });

    it('shows a value its filter no longer offers as it is', () => {
      const filters = [{ id: 'courses', label: 'Course', options: [{ value: 'edX+Bio', label: 'Biology' }] }];
      const query = { filters: { courses: ['edX+Bio', 'edX+Gone'] }, timeframe: { range: 'all', from: '', to: '' } };

      expect(appliedFilterChips(query, filters, true))
        .toEqual([{ id: 'courses', label: 'Course', value: 'Biology, edX+Gone' }]);
    });
  });
});
