/**
 * Segment tracking for React widgets. The legacy tooltips are tracked by js/views/tracking-view.js, which listens
 * for Bootstrap's 'shown.bs.tooltip' and sends the data-track-* attributes of the icon. Paragon's tooltips don't
 * fire that event, so a widget calls the function returned here when its tooltip is shown. It triggers the same
 * 'segment:track' event on the tracking model, with the same name and properties as the legacy summary cards
 * (templates/summary_point.html: title, category and type), and, like the legacy code, only once per card.
 */
export default function createTooltipTracker(trackingModel) {
  const tracked = {};
  return function trackTooltipShown(label) {
    if (!trackingModel || tracked[label]) {
      return;
    }
    tracked[label] = true;
    trackingModel.trigger('segment:track', 'edx.bi.tooltip.displayed', {
      title: label,
      category: 'summary',
      type: 'tooltip',
    });
  };
}
