import connectUrlStateToStore, { buildHash, parseHash } from 'course-list/react/platform/url-state';
import { coursesLoaded } from 'course-list/react/state/courses-slice';
import { filterChanged, pageChanged, searchChanged } from 'course-list/react/state/query-slice';
import createCourseListStore from 'course-list/react/state/store';
import { columnsChanged } from 'course-list/react/state/view-slice';

describe('the course list in the address of the page', () => {
  const SWITCHES = { passingUsersEnabled: true, filtersEnabled: true };
  const DEFAULT_HASH = '#?sortKey=catalog_course_title&order=asc&page=1';
  const parse = (hash, switches = SWITCHES) => parseHash(hash, { switches });

  describe('reading it', () => {
    it('has nothing to restore from no address', () => {
      ['', '#', '#?'].forEach((hash) => {
        expect(parse(hash)).toEqual({ query: {}, visibleColumns: null, invalid: false });
      });
    });

    it('reads an address in the legacy format', () => {
      const hash = '#?text_search=demo&availability=Current%2CUpcoming&sortKey=count&order=desc&page=3';

      expect(parse(hash)).toEqual({
        query: {
          search: 'demo',
          filters: { availability: ['Current', 'Upcoming'] },
          sort: { key: 'count', dir: 'desc' },
          page: 3,
        },
        visibleColumns: null,
        invalid: false,
      });
    });

    it('reads the plain address of the legacy page, and decodes what was encoded', () => {
      expect(parse('#?sortKey=catalog_course_title&order=asc&page=1').query)
        .toEqual({ sort: { key: 'catalog_course_title', dir: 'asc' }, page: 1 });
      expect(parse('#?text_search=a%20b%26c%3Dd').query.search).toBe('a b&c=d');
    });

    it('leaves out unknown parameters, as the legacy page did', () => {
      expect(parse('#?foo=bar&sortKey=nope&order=desc&availability=Bogus&page=2').query).toEqual({ page: 2 });
      expect(parse('#?availability=Current,Current,Upcoming').query.filters).toEqual({
        availability: ['Current', 'Upcoming'],
      });
    });

    it('sorts ascending unless the order says desc', () => {
      expect(parse('#?sortKey=count').query.sort).toEqual({ key: 'count', dir: 'asc' });
      expect(parse('#?sortKey=count&order=sideways').query.sort.dir).toBe('asc');
      expect(parse('#?order=desc').query.sort).toBeUndefined();
    });

    it('sorts only by a column that is shown: not a pending one, one the switches turn off or one not ticked', () => {
      expect(parse('#?sortKey=b2b_count').query.sort).toBeUndefined();
      expect(parse('#?sortKey=passing_users').query.sort).toBeDefined();
      expect(parse('#?sortKey=passing_users', { passingUsersEnabled: false }).query.sort).toBeUndefined();
      expect(parse('#?sortKey=total_engagements').query.sort).toBeUndefined();
      expect(parse('#?sortKey=count&cols=start_date').query.sort).toBeUndefined();
      expect(parse('#?sortKey=start_date&cols=start_date').query.sort).toEqual({ key: 'start_date', dir: 'asc' });
    });

    it('reads the ticked columns, leaving out unknown ones and the ones the switches turn off', () => {
      expect(parse('#?cols=start_date,count,nope,passing_users').visibleColumns)
        .toEqual(['start_date', 'count', 'passing_users']);
      expect(parse('#?cols=start_date,passing_users', { passingUsersEnabled: false }).visibleColumns)
        .toEqual(['start_date']);
      expect(parse('#?cols=').visibleColumns).toEqual([]);
    });

    it('limits the length of the search text', () => {
      expect(parse(`#?text_search=${'a'.repeat(500)}`).query.search.length).toBe(200);
    });

    it('calls an address invalid when the page is not a whole number from 1, and leaves the page out', () => {
      ['abc', '0', '-1', '1.5', ''].forEach((page) => {
        const result = parse(`#?sortKey=count&page=${page}`);
        expect(result.invalid).toBe(true);
        expect(result.query.page).toBeUndefined();
        expect(result.query.sort).toEqual({ key: 'count', dir: 'asc' });
      });
    });

    it('calls an address invalid when it cannot be decoded', () => {
      expect(parse('#?text_search=%E0%A4%A').invalid).toBe(true);
    });
  });

  describe('writing it', () => {
    const query = overrides => ({
      search: '', filters: {}, sort: { key: 'catalog_course_title', dir: 'asc' }, page: 1, ...overrides,
    });

    it('writes the plain address of the legacy page for the start', () => {
      expect(buildHash({ query: query(), visibleColumns: null })).toBe(DEFAULT_HASH);
    });

    it('writes the search, filters, sort and page in the legacy order, and the ticked columns', () => {
      const hash = buildHash({
        query: query({
          search: 'a b&c', filters: { availability: ['Current', 'Upcoming'] }, sort: { key: 'count', dir: 'desc' }, page: 3,
        }),
        visibleColumns: ['start_date', 'count'],
      });

      expect(hash).toBe(
        '#?text_search=a%20b%26c&availability=Current%2CUpcoming&sortKey=count&order=desc&page=3&cols=start_date%2Ccount',
      );
    });

    it('writes what it reads back', () => {
      const original = query({
        search: 'a b&c=d', filters: { availability: ['Archived'] }, sort: { key: 'end_date', dir: 'desc' }, page: 7,
      });
      const restored = parse(buildHash({ query: original, visibleColumns: ['end_date'] }));

      expect(restored.query).toEqual(original);
      expect(restored.visibleColumns).toEqual(['end_date']);
    });
  });

  describe('keeping the store and the address in step', () => {
    let store;
    let win;
    let stop;

    const makeWindow = (hash = '') => {
      const listeners = {};
      const fakeWindow = {
        location: { hash, pathname: '/courses/', search: '?x=1' },
        history: {
          state: null,
          replaceState: jasmine.createSpy('replaceState').and.callFake((state, title, url) => {
            fakeWindow.location.hash = url.slice(url.indexOf('#'));
          }),
        },
        addEventListener: (type, listener) => { listeners[type] = listener; },
        removeEventListener: (type) => { delete listeners[type]; },
        listeners,
        changeHash: (next) => {
          fakeWindow.location.hash = next;
          listeners.hashchange();
        },
      };
      return fakeWindow;
    };
    const start = (hash) => {
      win = makeWindow(hash);
      stop = connectUrlStateToStore(store, { switches: SWITCHES, win });
    };
    const rows = count => Array.from({ length: count }, (value, index) => ({
      course_id: `c-${index}`, catalog_course_title: `Course ${index}`,
    }));

    beforeEach(() => {
      store = createCourseListStore();
    });

    afterEach(() => {
      if (stop) {
        stop();
        stop = null;
      }
    });

    it('restores the view from the address when it starts', () => {
      start('#?text_search=demo&availability=Current&sortKey=count&order=desc&page=4&cols=count');

      expect(store.getState().query).toEqual({
        search: 'demo', filters: { availability: ['Current'] }, sort: { key: 'count', dir: 'desc' }, page: 4,
      });
      expect(store.getState().view).toEqual({ visibleColumns: ['count'], urlInvalid: false });
    });

    it('writes the plain address of the legacy page when the address has nothing, keeping the path and query', () => {
      start('');

      expect(win.history.replaceState).toHaveBeenCalledWith(null, '', `/courses/?x=1${DEFAULT_HASH}`);
    });

    it('writes the address when the search, a filter, the sort, the page or the columns change', () => {
      start('');
      store.dispatch(searchChanged('algebra'));
      expect(win.location.hash).toBe('#?text_search=algebra&sortKey=catalog_course_title&order=asc&page=1');

      store.dispatch(filterChanged({ id: 'availability', values: ['Current'] }));
      expect(win.location.hash).toContain('availability=Current');

      store.dispatch(pageChanged(2));
      expect(win.location.hash).toContain('page=2');

      store.dispatch(columnsChanged(['count']));
      expect(win.location.hash).toContain('cols=count');
    });

    it('does not rewrite an address that is already right', () => {
      start(DEFAULT_HASH);

      expect(win.history.replaceState).not.toHaveBeenCalled();
    });

    it('writes the page that is shown: the last page for one past the end, once the rows are loaded', () => {
      start('#?page=9');
      expect(win.location.hash).toContain('page=9');

      store.dispatch(coursesLoaded({ rows: rows(150), programs: [] }));
      expect(win.location.hash).toContain('page=2');
    });

    it('restores the view when the address changes by itself, and goes back to the start for the plain address', () => {
      start('');
      win.changeHash('#?text_search=biology&page=2');
      expect(store.getState().query.search).toBe('biology');
      expect(store.getState().query.page).toBe(2);

      win.changeHash('');
      expect(store.getState().query.search).toBe('');
      expect(store.getState().query.page).toBe(1);
      expect(win.location.hash).toBe(DEFAULT_HASH);
    });

    it('leaves an invalid address as it is and flags it, until the user changes something', () => {
      start('#?sortKey=count&page=abc');
      expect(store.getState().view.urlInvalid).toBe(true);
      expect(store.getState().query.sort).toEqual({ key: 'count', dir: 'asc' });
      expect(win.history.replaceState).not.toHaveBeenCalled();

      store.dispatch(searchChanged('x'));
      expect(store.getState().view.urlInvalid).toBe(false);
      expect(win.location.hash).toContain('text_search=x');
      expect(win.location.hash).not.toContain('abc');
    });

    it('stops listening when it is stopped', () => {
      start('');
      stop();
      stop = null;
      win.history.replaceState.calls.reset();

      store.dispatch(searchChanged('after'));
      expect(win.history.replaceState).not.toHaveBeenCalled();
      expect(win.listeners.hashchange).toBeUndefined();
    });
  });
});
