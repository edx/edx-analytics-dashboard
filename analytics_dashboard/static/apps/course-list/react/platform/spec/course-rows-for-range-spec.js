import $ from 'jquery';

import { resetMonitoringForTests } from 'components/react/monitoring';
import connectRangeRowsToStore, { isRange, rangeQuery } from 'course-list/react/platform/course-rows-for-range';
import { coursesLoaded } from 'course-list/react/state/courses-slice';
import { timeframeChanged } from 'course-list/react/state/query-slice';
import createCourseListStore from 'course-list/react/state/store';

const fixture = require('course-list/react/spec/fixtures/course-list-rows.json');

describe('course rows for the Timeframe', () => {
  const ROWS_URL = '/courses/json/course_list/';
  let originalRum;
  let rum;
  let store;
  let requests;
  let ajax;
  let showPageRows;

  // Each request is answered by hand, so the specs can choose the order of the answers.
  const answer = (index, data) => requests[index].deferred.resolve(data);
  const fail = index => requests[index].deferred.reject({ status: 503 });
  const connect = () => connectRangeRowsToStore(store, { rowsUrl: ROWS_URL, showPageRows, ajax });
  const choose = timeframe => store.dispatch(timeframeChanged(timeframe));
  const courses = () => store.getState().courses;
  const reportedContext = () => rum.addError.calls.argsFor(0)[1];

  beforeEach(() => {
    resetMonitoringForTests();
    originalRum = window.DD_RUM;
    rum = {
      addError: jasmine.createSpy('addError'),
      addAction: jasmine.createSpy('addAction'),
    };
    window.DD_RUM = rum;
    // The monitoring adapter logs reported failures to the console in development builds.
    spyOn(console, 'error');
    requests = [];
    ajax = jasmine.createSpy('ajax').and.callFake((options) => {
      const deferred = $.Deferred();
      requests.push({ options, deferred });
      return deferred.promise();
    });
    store = createCourseListStore();
    store.dispatch(coursesLoaded({ rows: [{ course_id: 'all-time' }], programs: fixture.programs }));
    showPageRows = jasmine.createSpy('showPageRows');
  });

  afterEach(() => {
    window.DD_RUM = originalRum;
  });

  describe('which timeframes have their own rows', () => {
    it('are the ranges of days, and Custom with both dates', () => {
      expect(isRange({ range: '7d', from: '', to: '' })).toBe(true);
      expect(isRange({ range: '60d', from: '', to: '' })).toBe(true);
      expect(isRange({ range: 'custom', from: '2026-10-21', to: '2026-10-24' })).toBe(true);
      expect(isRange({ range: 'all', from: '', to: '' })).toBe(false);
      expect(isRange({ range: 'custom', from: '2026-10-21', to: '' })).toBe(false);
      expect(isRange({ range: 'custom', from: '', to: '' })).toBe(false);
    });

    it('are asked for with the keys of the address', () => {
      expect(rangeQuery({ range: '30d', from: '', to: '' })).toBe('timeframe=30d');
      expect(rangeQuery({ range: 'custom', from: '2026-10-21', to: '2026-10-24' }))
        .toBe('timeframe=custom&from=2026-10-21&to=2026-10-24');
      expect(rangeQuery({ range: 'custom', from: '2026-10-21', to: '' })).toBe('');
    });
  });

  it('asks for nothing while the Timeframe is All Time', () => {
    connect();

    expect(ajax).not.toHaveBeenCalled();
    expect(showPageRows).not.toHaveBeenCalled();
    expect(courses().status).toBe('ready');
  });

  it('fetches the rows of a range, loading meanwhile, and stores them with the programs', () => {
    connect();
    choose({ range: '30d' });

    expect(ajax).toHaveBeenCalledTimes(1);
    expect(requests[0].options).toEqual({ url: `${ROWS_URL}?timeframe=30d`, dataType: 'json' });
    expect(courses().status).toBe('loading');

    answer(0, { course_list_json: fixture.rows });

    expect(courses().status).toBe('ready');
    expect(courses().rows.map(row => row.course_id)).toEqual(fixture.rows.map(row => row.course_id));
    // Normalized as the page data's rows are, with the programs already stored.
    expect(courses().rows[0].verified_enrollment).toBe(40);
    expect(courses().rows[0].program_ids).toEqual(['program-a', 'program-b']);
    expect(courses().programs).toEqual(fixture.programs);
  });

  it('fetches Custom only once it has both dates', () => {
    connect();
    choose({ range: 'custom', from: '2026-10-21', to: '' });

    expect(ajax).not.toHaveBeenCalled();

    choose({ range: 'custom', from: '2026-10-21', to: '2026-10-24' });

    expect(requests[0].options.url).toBe(`${ROWS_URL}?timeframe=custom&from=2026-10-21&to=2026-10-24`);
  });

  it('shows the page\'s own rows again back on All Time, and ignores the answer it was waiting for', () => {
    connect();
    choose({ range: '7d' });
    choose({ range: 'all' });

    expect(showPageRows).toHaveBeenCalledTimes(1);

    answer(0, { course_list_json: fixture.rows });

    expect(courses().rows).toEqual([{ course_id: 'all-time' }]);
  });

  it('keeps the rows of the latest range when an older answer comes last', () => {
    connect();
    choose({ range: '7d' });
    choose({ range: '60d' });
    answer(1, { course_list_json: [fixture.rows[1]] });
    answer(0, { course_list_json: fixture.rows });

    expect(courses().rows.map(row => row.course_id)).toEqual([fixture.rows[1].course_id]);
  });

  it('does not ask again for the range it shows', () => {
    connect();
    choose({ range: '7d' });
    answer(0, { course_list_json: fixture.rows });
    choose({ range: '7d', from: '', to: '' });

    expect(ajax).toHaveBeenCalledTimes(1);
  });

  it('fetches at once the range of the page\'s address', () => {
    choose({ range: '60d' });
    connect();

    expect(requests[0].options.url).toBe(`${ROWS_URL}?timeframe=60d`);
  });

  it('adds the range to a URL that already has a query', () => {
    connectRangeRowsToStore(store, { rowsUrl: '/rows/?v=1', showPageRows, ajax });
    choose({ range: '7d' });

    expect(requests[0].options.url).toBe('/rows/?v=1&timeframe=7d');
  });

  it('shows the "no course data" message for an empty list', () => {
    connect();
    choose({ range: '7d' });
    answer(0, { course_list_json: [] });

    expect(courses().status).toBe('unavailable');
    expect(rum.addError).not.toHaveBeenCalled();
  });

  it('shows the error message and reports it when the request fails', () => {
    connect();
    choose({ range: '7d' });
    fail(0);

    expect(courses().status).toBe('error');
    expect(rum.addError).toHaveBeenCalledTimes(1);
    expect(reportedContext()['insights.react.widget']).toBe('course-list');
    expect(reportedContext()['insights.react.failure_type']).toBe('fetch_error');
    expect(reportedContext()['insights.react.recovery']).toBe('error_state');
  });

  it('ignores a failure of a range the user has left', () => {
    connect();
    choose({ range: '7d' });
    choose({ range: '30d' });
    fail(0);
    answer(1, { course_list_json: fixture.rows });

    expect(courses().status).toBe('ready');
    expect(rum.addError).not.toHaveBeenCalled();
  });

  it('shows the error message for an answer that is not a list of rows', () => {
    connect();
    choose({ range: '7d' });
    answer(0, { error: 'oops' });

    expect(courses().status).toBe('error');
    expect(reportedContext()['insights.react.failure_type']).toBe('invalid_update');
  });

  it('drops the rows without a course ID, and reports them', () => {
    connect();
    choose({ range: '7d' });
    answer(0, { course_list_json: [fixture.rows[0], { count: 3 }] });

    expect(courses().rows.length).toBe(1);
    expect(reportedContext()['insights.react.recovery']).toBe('dropped_invalid_rows');
  });

  it('stops following the Timeframe, and ignores a late answer, once stopped', () => {
    const stop = connect();
    choose({ range: '7d' });
    stop();
    answer(0, { course_list_json: fixture.rows });
    choose({ range: '30d' });

    expect(ajax).toHaveBeenCalledTimes(1);
    expect(courses().status).toBe('loading');
  });
});
