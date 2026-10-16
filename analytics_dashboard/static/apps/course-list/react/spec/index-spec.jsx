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
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
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
    expect(root.querySelectorAll('.insights-course-table tbody tr').length).toBe(4);
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

  it('puts Download CSV in the results toolbar and sends the legacy course link event', () => {
    const events = [];
    trackingModel.on('segment:track', (...args) => events.push(args));
    start(modelWith({ course_list_json: fixture.rows, course_list_download_url: '/courses/csv/course_list/' }));

    expect(root.querySelector('.insights-results-actions a').getAttribute('href')).toBe('/courses/csv/course_list/');
    const link = root.querySelector('.insights-course-link');
    act(() => {
      link.addEventListener('click', event => event.preventDefault());
      link.click();
    });
    expect(events.map(args => args[0])).toEqual(['edx.bi.ui.menu.navigated']);
  });

  it('throws when the page has no mount point', () => {
    setFixtures('<div id="somewhere-else"></div>');

    expect(() => startReactPage({ courseModel: modelWith({}) })).toThrowError(/course-list-react-root/);
  });

  it('sends the page view of the course list when it starts', () => {
    const pageViews = jasmine.createSpy('pageViews');
    trackingModel.on('segment:page', pageViews);
    start(modelWith({ course_list_json: fixture.rows }));

    expect(trackingModel.get('page').name).toBe('insights_home');
    expect(pageViews).toHaveBeenCalledTimes(1);
  });

  it('shows the view in the address of the page, and keeps the address up to date', () => {
    jasmine.clock().install();
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#?text_search=bio&sortKey=cumulative_count&order=desc`);
    start(modelWith({ course_list_json: fixture.rows }));

    expect(root.querySelector('input[type="search"]').value).toBe('bio');
    expect(Array.prototype.map.call(root.querySelectorAll('.insights-course-title'), node => node.textContent))
      .toEqual(['Biology']);
    expect(root.querySelector('thead th[aria-sort="descending"]').textContent).toContain('Total Enrollment');

    const header = Array.prototype.find.call(
      root.querySelectorAll('thead th button'),
      node => node.textContent.indexOf('Start Date') === 0,
    );
    act(() => header.click());
    // The address is rewritten once the view has stopped changing for a moment.
    jasmine.clock().tick(250);
    expect(window.location.hash).toBe('#?text_search=bio&sortKey=start_date&order=asc&page=1');
    jasmine.clock().uninstall();
  });
});
