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

/**
 * The analytics of the filter bar, with the names and properties of the legacy course list (search.js, the
 * filter view and the download link): a search only when there is text, a filter with the selected values.
 */
export function createControlsTracker(trackingModel) {
  const track = (name, category) => {
    if (trackingModel) {
      trackingModel.trigger('segment:track', name, { category });
    }
  };
  return {
    searched: (text) => {
      if (text) {
        track('edx.bi.course_list.searched', 'search');
      }
    },
    filtered: values => track('edx.bi.course_list.filtered', values.join(',')),
    csvDownloaded: () => track('edx.bi.csv.downloaded', 'course_list'),
  };
}
