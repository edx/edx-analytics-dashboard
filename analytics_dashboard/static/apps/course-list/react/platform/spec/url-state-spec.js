import connectUrlStateToStore, { buildHash, parseHash } from 'course-list/react/platform/url-state';
import { resolveFilters } from 'course-list/react/registries/filters';
import { coursesLoaded, coursesUnavailable } from 'course-list/react/state/courses-slice';
import { filterChanged, pageChanged, searchChanged } from 'course-list/react/state/query-slice';
import createCourseListStore from 'course-list/react/state/store';
import { columnsChanged } from 'course-list/react/state/view-slice';

describe('the course list in the address of the page', () => {
  const SWITCHES = { passingUsersEnabled: true, filtersEnabled: true, timeframeEnabled: true };
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

    it('limits the length of the search text, cutting by whole characters, never in the middle of an emoji', () => {
      expect(parse(`#?text_search=${'a'.repeat(500)}`).query.search.length).toBe(200);

      // 199 letters and an emoji (two UTF-16 units) are 200 characters: all kept.
      // One more letter: the emoji is cut off whole.
      const emoji = '\uD83D\uDE00';
      const kept = parse(`#?text_search=${encodeURIComponent('a'.repeat(199) + emoji)}`).query.search;
      expect(kept).toBe('a'.repeat(199) + emoji);
      const cut = parse(`#?text_search=${encodeURIComponent('a'.repeat(200) + emoji)}`).query.search;
      expect(cut).toBe('a'.repeat(200));
      expect(() => encodeURIComponent(kept)).not.toThrow();
      expect(() => encodeURIComponent(cut)).not.toThrow();
    });

    it('reads the Pacing filter, and the Program filter for the programs the page has, as in a legacy link', () => {
      const filters = resolveFilters({
        rows: [], programs: [{ program_id: 'program-a', program_title: 'Program A', course_ids: [] }],
      });
      const hash = '#?pacing_type=self_paced,bogus&program_ids=program-a,program-z';

      expect(parseHash(hash, { switches: SWITCHES, filters }).query.filters)
        .toEqual({ program_ids: ['program-a'], pacing_type: ['self_paced'] });
      expect(parse(hash).query.filters).toEqual({ pacing_type: ['self_paced'] });
    });

    it('reads the timeframe, with dates only for Custom and only well-formed ones', () => {
      expect(parse('#?timeframe=30d&from=2026-01-01').query.timeframe).toEqual({ range: '30d', from: '', to: '' });
      expect(parse('#?timeframe=custom&from=2026-01-01&to=nope').query.timeframe)
        .toEqual({ range: 'custom', from: '2026-01-01', to: '' });
      expect(parse('#?timeframe=forever').query.timeframe).toBeUndefined();
    });

    it('drops impossible dates, and To when it is before From (as the menu does)', () => {
      const custom = hash => parse(`#?timeframe=custom&${hash}`).query.timeframe;

      expect(custom('from=2026-13-45&to=2026-02-30')).toEqual({ range: 'custom', from: '', to: '' });
      expect(custom('from=2024-02-29&to=2024-03-01')).toEqual({ range: 'custom', from: '2024-02-29', to: '2024-03-01' });
      expect(custom('from=2026-05-02&to=2026-05-01')).toEqual({ range: 'custom', from: '2026-05-02', to: '' });
    });

    it('ignores the timeframe while its menu is hidden', () => {
      expect(parse('#?timeframe=30d', { ...SWITCHES, timeframeEnabled: false }).query.timeframe).toBeUndefined();
    });

    it('writes the timeframe after the search, and nothing for All Time', () => {
      const base = {
        search: 'demo', filters: {}, sort: { key: 'count', dir: 'desc' }, page: 1,
      };

      expect(buildHash({ query: { ...base, timeframe: { range: 'custom', from: '2026-01-01', to: '2026-02-01' } } }))
        .toBe('#?text_search=demo&timeframe=custom&from=2026-01-01&to=2026-02-01&sortKey=count&order=desc&page=1');
      expect(buildHash({ query: { ...base, timeframe: { range: 'all', from: '', to: '' } } }))
        .toBe('#?text_search=demo&sortKey=count&order=desc&page=1');
    });

    it('reads the Course filter for the courses the page has', () => {
      const filters = resolveFilters({ rows: [{ course_id: 'run-1', catalog_course: 'edX+Bio' }], programs: [] });

      expect(parseHash('#?courses=edX%2BBio,edX%2BNope', { switches: SWITCHES, filters }).query.filters)
        .toEqual({ courses: ['edX+Bio'] });
    });

    it('reads filters only when the course filters switch is on, as the legacy page offered them only then', () => {
      expect(parse('#?availability=Archived').query.filters).toEqual({ availability: ['Archived'] });
      expect(parse('#?availability=Archived', { passingUsersEnabled: true, filtersEnabled: false }).query.filters)
        .toBeUndefined();
    });

    it('accepts a sort by a pending column once it has data', () => {
      const options = { switches: SWITCHES, dataColumnIds: ['catalog_course_title', 'count', 'b2b_count'] };

      expect(parseHash('#?sortKey=b2b_count&order=desc', options).query.sort).toEqual({ key: 'b2b_count', dir: 'desc' });
      expect(parseHash('#?sortKey=sales_model', options).query.sort).toBeUndefined();
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
    // The address is rewritten once the view has stopped changing for a moment.
    const settle = () => jasmine.clock().tick(250);
    const rows = count => Array.from({ length: count }, (value, index) => ({
      course_id: `c-${index}`, catalog_course_title: `Course ${index}`,
    }));

    beforeEach(() => {
      jasmine.clock().install();
      store = createCourseListStore();
    });

    afterEach(() => {
      if (stop) {
        stop();
        stop = null;
      }
      jasmine.clock().uninstall();
    });

    it('restores the view from the address when it starts', () => {
      start('#?text_search=demo&availability=Current&sortKey=count&order=desc&page=4&cols=count');

      expect(store.getState().query).toEqual({
        search: 'demo',
        filters: { availability: ['Current'] },
        sort: { key: 'count', dir: 'desc' },
        page: 4,
        timeframe: { range: 'all', from: '', to: '' },
      });
      expect(store.getState().view).toEqual({ visibleColumns: ['count'], urlInvalid: false });
    });

    it('reads the address again when the course data comes after it, so its Program and Course filters are kept', () => {
      start('#?program_ids=program-a,program-z&courses=edX%2BBio&text_search=bio');
      expect(store.getState().query.filters).toEqual({});
      settle();

      store.dispatch(coursesLoaded({
        rows: [{
          course_id: 'c-0', catalog_course: 'edX+Bio', catalog_course_title: 'Biology', program_ids: ['program-a'],
        }],
        programs: [{ program_id: 'program-a', program_title: 'Program A', course_ids: ['c-0'] }],
      }));
      settle();

      expect(store.getState().query.filters).toEqual({ program_ids: ['program-a'], courses: ['edX+Bio'] });
      expect(win.location.hash).toBe('#?text_search=bio&program_ids=program-a&courses=edX%2BBio'
        + '&sortKey=catalog_course_title&order=asc&page=1');
    });

    it('reads the address again when the page had no course data at first and gets it later', () => {
      store.dispatch(coursesUnavailable());
      start('#?courses=edX%2BBio');
      expect(store.getState().query.filters).toEqual({});

      store.dispatch(coursesLoaded({ rows: [{ course_id: 'c-0', catalog_course: 'edX+Bio' }], programs: [] }));

      expect(store.getState().query.filters).toEqual({ courses: ['edX+Bio'] });
    });

    it('clears the "invalid" message the user changed something under while the course data was loading', () => {
      start('#?page=abc');
      expect(store.getState().view.urlInvalid).toBe(true);
      store.dispatch(searchChanged('algebra'));
      store.dispatch(coursesLoaded({ rows: rows(1), programs: [] }));

      expect(store.getState().view.urlInvalid).toBe(false);
      expect(store.getState().query.search).toBe('algebra');
    });

    it('keeps what the user changed before the course data came, and adds the link\'s Program and Course', () => {
      start('#?program_ids=program-a&availability=Current&courses=edX%2BBio');
      store.dispatch(searchChanged('algebra'));
      store.dispatch(filterChanged({ id: 'availability', values: [] }));
      store.dispatch(coursesLoaded({
        rows: [{ course_id: 'c-0', catalog_course: 'edX+Bio', program_ids: [] }],
        programs: [{ program_id: 'program-a', course_ids: [] }],
      }));
      settle();

      expect(store.getState().query.search).toBe('algebra');
      // Availability, which the user cleared, stays cleared.
      expect(store.getState().query.filters).toEqual({ program_ids: ['program-a'], courses: ['edX+Bio'] });
      expect(win.location.hash).toContain('program_ids=program-a&courses=edX%2BBio');
    });

    it('restores a Program filter for the programs in the store', () => {
      store.dispatch(coursesLoaded({
        rows: [{ course_id: 'c-0', catalog_course_title: 'Course 0', program_ids: ['program-a'] }],
        programs: [{ program_id: 'program-a', program_title: 'Program A', course_ids: ['c-0'] }],
      }));
      start('#?program_ids=program-a,program-z');

      expect(store.getState().query.filters).toEqual({ program_ids: ['program-a'] });
    });

    it('writes the plain address of the legacy page when the address has nothing, keeping the path and query', () => {
      start('');

      expect(win.history.replaceState).toHaveBeenCalledWith(null, '', `/courses/?x=1${DEFAULT_HASH}`);
    });

    it('writes the address when the search, a filter, the sort, the page or the columns change', () => {
      start('');
      store.dispatch(searchChanged('algebra'));
      settle();
      expect(win.location.hash).toBe('#?text_search=algebra&sortKey=catalog_course_title&order=asc&page=1');

      store.dispatch(filterChanged({ id: 'availability', values: ['Current'] }));
      settle();
      expect(win.location.hash).toContain('availability=Current');

      store.dispatch(pageChanged(2));
      settle();
      expect(win.location.hash).toContain('page=2');

      store.dispatch(columnsChanged(['count']));
      settle();
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
      settle();
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
      settle();
      expect(win.location.hash).toContain('text_search=x');
      expect(win.location.hash).not.toContain('abc');
    });

    it('stops listening when it is stopped', () => {
      start('');
      stop();
      stop = null;
      win.history.replaceState.calls.reset();

      store.dispatch(searchChanged('after'));
      settle();
      expect(win.history.replaceState).not.toHaveBeenCalled();
      expect(win.listeners.hashchange).toBeUndefined();
    });

    it('writes the address once after a burst of changes, not on every keystroke', () => {
      start('');
      win.history.replaceState.calls.reset();

      ['a', 'al', 'alg', 'alge'].forEach(text => store.dispatch(searchChanged(text)));
      expect(win.history.replaceState).not.toHaveBeenCalled();
      settle();

      expect(win.history.replaceState).toHaveBeenCalledTimes(1);
      expect(win.location.hash).toContain('text_search=alge');
    });

    it('ignores an address change that is not the course list\'s, such as the skip link\'s #content', () => {
      start('#?text_search=demo&sortKey=count&order=desc&page=2');
      const before = store.getState().query;

      win.changeHash('#content');

      expect(store.getState().query).toBe(before);
      expect(store.getState().query.search).toBe('demo');
    });

    it('does not break when the address can not be written: the view keeps working', () => {
      start('');
      // Half an emoji can not be encoded; and a browser may refuse to rewrite the address too often.
      expect(() => {
        store.dispatch(searchChanged('\uD83D'));
        settle();
      }).not.toThrow();
      expect(store.getState().query.search).toBe('\uD83D');

      win.history.replaceState.and.throwError('SecurityError');
      expect(() => {
        store.dispatch(searchChanged('ok'));
        settle();
      }).not.toThrow();
      expect(store.getState().query.search).toBe('ok');
    });

    it('clears the "invalid" message when the columns change, and then rewrites the address', () => {
      start('#?page=abc');
      expect(store.getState().view.urlInvalid).toBe(true);

      store.dispatch(columnsChanged(['count']));
      expect(store.getState().view.urlInvalid).toBe(false);
      settle();
      expect(win.location.hash).toContain('cols=count');
      expect(win.location.hash).not.toContain('abc');
    });

    it('restores a sort by a pending column that has data', () => {
      store.dispatch(coursesLoaded({
        rows: [{ course_id: 'c-1', catalog_course_title: 'A', b2b_count: 3 }], programs: [],
      }));
      start('#?sortKey=b2b_count&order=desc');

      expect(store.getState().query.sort).toEqual({ key: 'b2b_count', dir: 'desc' });
    });
  });
});
