import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import ParagonProvider from 'components/react/paragon/ParagonProvider';
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
  const checkboxes = () => element.querySelectorAll('input[type="checkbox"]');
  const downloadLink = () => element.querySelector('a');
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
      downloadUrl: '/courses/csv/',
      onSearch: jasmine.createSpy('onSearch'),
      onFilter: jasmine.createSpy('onFilter'),
      onDownload: jasmine.createSpy('onDownload'),
    };
    setFixtures('<div id="controls-root"></div>');
    element = document.getElementById('controls-root');
    root = createRoot(element);
    store = createCourseListStore();
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('has the search box, the Availability filter and the Download CSV link', () => {
    render();

    expect(searchInput().getAttribute('aria-label')).toBe('Find a course');
    expect(toggle().textContent).toBe('Availability');
    expect(downloadLink().textContent).toBe('Download CSV');
    expect(downloadLink().getAttribute('href')).toBe('/courses/csv/');
  });

  it('has no filters when the server did not enable them, and no link without a URL', () => {
    props.filtersEnabled = false;
    props.downloadUrl = '';
    render();

    expect(searchInput()).not.toBeNull();
    expect(toggle()).toBeNull();
    expect(downloadLink()).toBeNull();
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

    expect(store.getState().query.filters).toEqual({ availability: ['Upcoming', 'Current'] });
    expect(props.onFilter.calls.mostRecent().args[0]).toEqual(['Upcoming', 'Current']);
    expect(toggle().textContent).toBe('Availability (2)');

    act(() => checkboxes()[0].click());
    expect(store.getState().query.filters).toEqual({ availability: ['Current'] });
  });

  it('reports a click on Download CSV', () => {
    render();
    act(() => {
      downloadLink().addEventListener('click', event => event.preventDefault());
      downloadLink().click();
    });

    expect(props.onDownload).toHaveBeenCalledTimes(1);
  });
});
