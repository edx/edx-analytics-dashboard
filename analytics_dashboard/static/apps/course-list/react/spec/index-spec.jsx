import { act } from 'react';

import CourseModel from 'models/course-model';
import { resetMonitoringForTests } from 'components/react/monitoring';
import startReactPage from 'course-list/react/index';

const fixture = require('course-list/react/spec/fixtures/course-list-rows.json');

describe('startReactPage', () => {
  let originalRum;
  let rum;
  let root;

  const start = (courseModel) => {
    act(() => {
      startReactPage({ courseModel });
    });
  };

  beforeEach(() => {
    resetMonitoringForTests();
    originalRum = window.DD_RUM;
    rum = {
      addError: jasmine.createSpy('addError'),
      addAction: jasmine.createSpy('addAction'),
    };
    window.DD_RUM = rum;
    // React and the monitoring adapter log caught errors to the console in development builds.
    spyOn(console, 'error');
    setFixtures('<div id="course-list-react-root"><div class="loading-container">Loading</div></div>');
    root = document.getElementById('course-list-react-root');
  });

  afterEach(() => {
    window.DD_RUM = originalRum;
  });

  it('draws the page inside the Paragon scope, in place of the spinner', () => {
    start(new CourseModel({ course_list_json: fixture.rows, programs_json: fixture.programs }));

    expect(root.querySelector('.loading-container')).toBeNull();
    expect(root.querySelector('.paragon-styles')).not.toBeNull();
    expect(Array.prototype.map.call(root.querySelectorAll('h2'), node => node.textContent))
      .toEqual(['Performance summary', 'Courses']);
    expect(root.getAttribute('data-react-rendered')).toBe('course-list');
    expect(rum.addError).not.toHaveBeenCalled();
  });

  it('returns the store, filled from the page model', () => {
    let store;
    act(() => {
      store = startReactPage({ courseModel: new CourseModel({ course_list_json: fixture.rows }) });
    });

    expect(store.getState().courses.status).toBe('ready');
    expect(store.getState().courses.rows.length).toBe(4);
  });

  it('updates the page when the page model changes', () => {
    const courseModel = new CourseModel({});
    start(courseModel);
    expect(root.querySelector('.insights-empty-state-message')).not.toBeNull();

    act(() => {
      courseModel.set('course_list_json', fixture.rows);
    });

    expect(root.querySelector('.insights-empty-state-message')).toBeNull();
    expect(root.querySelector('.insights-placeholder')).not.toBeNull();
  });

  [
    ['no course list', {}],
    ['an empty course list', { course_list_json: [] }],
  ].forEach(([description, attributes]) => {
    it(`shows the "no course data" message for ${description}`, () => {
      start(new CourseModel(attributes));

      expect(root.querySelector('.insights-empty-state-message').textContent)
        .toBe('No course data is currently available for your course.');
    });
  });

  it('throws when the page has no mount point', () => {
    setFixtures('<div id="somewhere-else"></div>');

    expect(() => startReactPage({ courseModel: new CourseModel({}) })).toThrowError(/course-list-react-root/);
  });
});
