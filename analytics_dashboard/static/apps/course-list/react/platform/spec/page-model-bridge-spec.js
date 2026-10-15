import CourseModel from 'models/course-model';
import { resetMonitoringForTests } from 'components/react/monitoring';
import connectPageModelToStore from 'course-list/react/platform/page-model-bridge';
import createCourseListStore from 'course-list/react/state/store';

const fixture = require('course-list/react/spec/fixtures/course-list-rows.json');

describe('page model bridge', () => {
  let originalRum;
  let rum;
  let store;

  const connect = attributes => connectPageModelToStore(new CourseModel(attributes), store);
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
    store = createCourseListStore();
  });

  afterEach(() => {
    window.DD_RUM = originalRum;
  });

  it('starts as loading, before any page data is read', () => {
    expect(store.getState().courses.status).toBe('loading');
  });

  it('loads the rows and the programs', () => {
    connect({ course_list_json: fixture.rows, programs_json: fixture.programs });

    const { courses } = store.getState();
    expect(courses.status).toBe('ready');
    expect(courses.rows.length).toBe(4);
    expect(courses.rows[0].course_id).toBe('course-v1:Edx+Algebra+2024');
    expect(courses.programs).toEqual(fixture.programs);
    expect(rum.addError).not.toHaveBeenCalled();
  });

  it('loads the rows when the server sent no programs', () => {
    connect({ course_list_json: fixture.rows });

    expect(store.getState().courses.status).toBe('ready');
    expect(store.getState().courses.programs).toEqual([]);
  });

  it('loads an empty course list as ready', () => {
    connect({ course_list_json: [] });

    expect(store.getState().courses.status).toBe('ready');
    expect(store.getState().courses.rows).toEqual([]);
  });

  [
    ['missing', {}],
    ['null', { course_list_json: null }],
  ].forEach(([description, attributes]) => {
    it(`marks the data unavailable, without reporting an error, when the course list is ${description}`, () => {
      connect(attributes);

      expect(store.getState().courses.status).toBe('unavailable');
      expect(rum.addError).not.toHaveBeenCalled();
    });
  });

  [
    ['not a list', { course_list_json: 'oops' }],
    ['programs that are not a list', { course_list_json: [], programs_json: 'oops' }],
  ].forEach(([description, attributes]) => {
    it(`marks the data as an error and reports it once for ${description}`, () => {
      connect(attributes);

      expect(store.getState().courses.status).toBe('error');
      expect(rum.addError).toHaveBeenCalledTimes(1);
      expect(reportedContext()['insights.react.widget']).toBe('course-list');
      expect(reportedContext()['insights.react.failure_type']).toBe('invalid_update');
      expect(reportedContext()['insights.react.recovery']).toBe('error_state');
    });
  });

  it('drops rows without a course_id and reports it once', () => {
    connect({ course_list_json: [fixture.rows[0], { catalog_course_title: 'No id' }, null, 'text'] });

    expect(store.getState().courses.status).toBe('ready');
    expect(store.getState().courses.rows.length).toBe(1);
    expect(rum.addError).toHaveBeenCalledTimes(1);
    expect(reportedContext()['insights.react.recovery']).toBe('dropped_invalid_rows');
  });

  it('updates the store when the page model changes', () => {
    const courseModel = new CourseModel({ course_list_json: [fixture.rows[0]] });
    connectPageModelToStore(courseModel, store);

    courseModel.set('course_list_json', fixture.rows);

    expect(store.getState().courses.rows.length).toBe(4);
  });

  it('stops syncing when the returned function is called', () => {
    const courseModel = new CourseModel({ course_list_json: [fixture.rows[0]] });
    const stop = connectPageModelToStore(courseModel, store);

    stop();
    courseModel.set('course_list_json', fixture.rows);

    expect(store.getState().courses.rows.length).toBe(1);
  });
});
