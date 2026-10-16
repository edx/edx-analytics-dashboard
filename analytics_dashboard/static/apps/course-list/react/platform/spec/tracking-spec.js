import Backbone from 'backbone';

import createTooltipTracker, {
  createControlsTracker, createResultsTracker, trackPageView,
} from 'course-list/react/platform/tracking';

describe('createTooltipTracker', () => {
  let trackingModel;
  let events;

  beforeEach(() => {
    trackingModel = new Backbone.Model();
    events = [];
    trackingModel.on('segment:track', (...args) => events.push(args));
  });

  it('sends the same Segment event and properties as the legacy summary card tooltips', () => {
    createTooltipTracker(trackingModel)('Total Enrollment');

    expect(events).toEqual([
      ['edx.bi.tooltip.displayed', { title: 'Total Enrollment', category: 'summary', type: 'tooltip' }],
    ]);
  });

  it('sends the event only once per card', () => {
    const track = createTooltipTracker(trackingModel);
    track('Total Enrollment');
    track('Total Enrollment');
    track('Current Enrollment');

    expect(events.map(args => args[1].title)).toEqual(['Total Enrollment', 'Current Enrollment']);
  });

  it('does nothing without a tracking model', () => {
    expect(() => createTooltipTracker(undefined)('Total Enrollment')).not.toThrow();
  });
});

describe('createControlsTracker', () => {
  let trackingModel;
  let events;
  let track;

  beforeEach(() => {
    trackingModel = new Backbone.Model();
    events = [];
    trackingModel.on('segment:track', (...args) => events.push(args));
    track = createControlsTracker(trackingModel);
  });

  it('sends the legacy search event only when there is text', () => {
    track.searched('');
    track.searched('   ');
    track.searched('algebra');

    expect(events).toEqual([['edx.bi.course_list.searched', { category: 'search' }]]);
  });

  it('sends the legacy filter event with the selected values', () => {
    track.filtered(['Upcoming', 'Current']);

    expect(events).toEqual([['edx.bi.course_list.filtered', { category: 'Upcoming,Current' }]]);
  });

  it('sends the legacy CSV download event', () => {
    track.csvDownloaded();

    expect(events).toEqual([['edx.bi.csv.downloaded', { category: 'course_list' }]]);
  });

  it('does nothing without a tracking model', () => {
    expect(() => createControlsTracker(undefined).csvDownloaded()).not.toThrow();
  });
});

describe('createResultsTracker', () => {
  it('sends the legacy course link event, with the properties of the legacy link', () => {
    const trackingModel = new Backbone.Model();
    const events = [];
    trackingModel.on('segment:track', (...args) => events.push(args));

    createResultsTracker(trackingModel).courseOpened({
      course_id: 'course-v1:Edx+Algebra+2024', catalog_course_title: 'Algebra I',
    });

    expect(events).toEqual([['edx.bi.ui.menu.navigated', {
      type: 'click',
      text: 'Algebra I | course-v1:Edx+Algebra+2024',
      url: '/courses/course-v1:Edx+Algebra+2024',
      'target-scope': 'course',
      'target-lens': 'home',
      'menu-depth': 'insights',
      'link-name': 'course_row',
    }]]);
  });

  it('sends the legacy sort and page events (the 1-based page, as legacy), and the columns event', () => {
    const trackingModel = new Backbone.Model();
    const events = [];
    trackingModel.on('segment:track', (...args) => events.push(args));
    const track = createResultsTracker(trackingModel);

    track.sorted('count', 'desc');
    track.paged(3);
    track.columnsChanged('start_date', false);
    track.columnsChanged('total_engagements', true);

    expect(events).toEqual([
      ['edx.bi.course_list.sorted', { category: 'count_desc' }],
      ['edx.bi.course_list.paged', { category: 3 }],
      ['edx.bi.course_list.columns_changed', { category: 'start_date_hidden' }],
      ['edx.bi.course_list.columns_changed', { category: 'total_engagements_shown' }],
    ]);
  });

  it('does nothing without a tracking model', () => {
    expect(() => createResultsTracker(undefined).courseOpened({ course_id: 'a' })).not.toThrow();
  });
});

describe('trackPageView', () => {
  it('sets the page of the legacy course list and sends the page view', () => {
    const trackingModel = new Backbone.Model();
    const pageViews = jasmine.createSpy('pageViews');
    trackingModel.on('segment:page', pageViews);

    trackPageView(trackingModel);

    expect(trackingModel.get('page')).toEqual({
      scope: 'insights', lens: 'home', report: '', depth: '', name: 'insights_home',
    });
    expect(pageViews).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a tracking model', () => {
    expect(() => trackPageView(undefined)).not.toThrow();
  });
});
