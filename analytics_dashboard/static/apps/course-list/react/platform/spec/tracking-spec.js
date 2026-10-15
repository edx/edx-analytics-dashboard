import Backbone from 'backbone';

import createTooltipTracker from 'course-list/react/platform/tracking';

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
