import { act } from 'react';
import Backbone from 'backbone';

import CourseModel from 'models/course-model';
import { resetMonitoringForTests } from 'components/react/monitoring';
import startReactPage from 'course-list/react/index';

const fixture = require('course-list/react/spec/fixtures/course-list-rows.json');
const card = require('course-list/react/spec/fixtures/total-enrollment-card.json');

describe('startReactPage', () => {
  const TEXT = { total_enrollment: { label: card.label, tooltip: card.tooltip } };
  let originalRum;
  let rum;
  let root;
  let trackingModel;

  // The page model as the server builds it: the course rows, the programs and the text of the summary cards.
  const modelWith = attributes => new CourseModel({ summary_text: TEXT, ...attributes });
  const start = (courseModel) => {
    act(() => {
      startReactPage({ courseModel, trackingModel });
    });
  };
  // Only Paragon's tooltips: other specs can leave legacy Bootstrap 3 tooltips (.tooltip) in the body.
  const tooltips = () => document.querySelectorAll('.tooltip[class*="bs-tooltip-"]');

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
    trackingModel = new Backbone.Model();
    setFixtures('<div id="course-list-react-root"><div class="loading-container">Loading</div></div>');
    root = document.getElementById('course-list-react-root');
  });

  afterEach(() => {
    window.DD_RUM = originalRum;
    Array.prototype.forEach.call(tooltips(), (tooltip) => {
      tooltip.parentNode.removeChild(tooltip);
    });
  });

  it('draws the page inside the Paragon scope, in place of the spinner', () => {
    start(modelWith({ course_list_json: fixture.rows, programs_json: fixture.programs }));

    expect(root.querySelector('.loading-container')).toBeNull();
    expect(root.querySelector('.paragon-styles')).not.toBeNull();
    expect(Array.prototype.map.call(root.querySelectorAll('h2'), node => node.textContent))
      .toEqual(['Performance summary', 'Courses']);
    expect(root.getAttribute('data-react-rendered')).toBe('course-list');
    expect(rum.addError).not.toHaveBeenCalled();
  });

  it('shows the Total Enrollment card with the total of the course rows and the text from the page data', () => {
    start(modelWith({ course_list_json: fixture.rows }));

    expect(root.querySelectorAll('.pgn__card').length).toBe(1);
    expect(root.querySelector('.insights-summary-number').textContent).toBe('1,300');
    expect(root.querySelector('.insights-summary-label').textContent).toBe(card.label);
    expect(rum.addError).not.toHaveBeenCalled();
  });

  it('returns the store, filled from the page model', () => {
    let store;
    act(() => {
      store = startReactPage({ courseModel: modelWith({ course_list_json: fixture.rows }) });
    });

    expect(store.getState().courses.status).toBe('ready');
    expect(store.getState().courses.rows.length).toBe(4);
    expect(store.getState().summary.text).toEqual(TEXT);
  });

  it('updates the page and the card when the page model changes', () => {
    const courseModel = modelWith({});
    start(courseModel);
    expect(root.querySelector('.insights-empty-state-message')).not.toBeNull();
    expect(root.querySelector('.insights-summary-number').textContent).toBe('0');

    act(() => {
      courseModel.set('course_list_json', fixture.rows);
    });

    expect(root.querySelector('.insights-empty-state-message')).toBeNull();
    expect(root.querySelector('.insights-placeholder')).not.toBeNull();
    expect(root.querySelector('.insights-summary-number').textContent).toBe('1,300');
  });

  [
    ['no course list', {}],
    ['an empty course list', { course_list_json: [] }],
  ].forEach(([description, attributes]) => {
    it(`shows the "no course data" message for ${description}`, () => {
      start(modelWith(attributes));

      expect(root.querySelector('.insights-empty-state-message').textContent)
        .toBe('No course data is currently available for your course.');
    });
  });

  it('sends the tooltip analytics event once, when the help tooltip is shown', () => {
    const events = [];
    trackingModel.on('segment:track', (...args) => events.push(args));
    start(modelWith({ course_list_json: fixture.rows }));
    const show = () => {
      const event = document.createEvent('Event');
      event.initEvent('mouseover', true, true);
      act(() => {
        root.querySelector('button').dispatchEvent(event);
      });
    };

    show();
    show();

    expect(events).toEqual([
      ['edx.bi.tooltip.displayed', { title: card.label, category: 'summary', type: 'tooltip' }],
    ]);
  });

  it('throws when the page has no mount point', () => {
    setFixtures('<div id="somewhere-else"></div>');

    expect(() => startReactPage({ courseModel: modelWith({}) })).toThrowError(/course-list-react-root/);
  });
});
