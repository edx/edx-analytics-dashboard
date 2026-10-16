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
      if (text.trim()) {
        track('edx.bi.course_list.searched', 'search');
      }
    },
    filtered: values => track('edx.bi.course_list.filtered', values.join(',')),
    csvDownloaded: () => track('edx.bi.csv.downloaded', 'course_list'),
  };
}

/**
 * The page view of the course list, with the properties the legacy page's controller sets
 * (course-list/app/controller.js). The React page sends it once, when it starts.
 */
export function trackPageView(trackingModel) {
  if (trackingModel) {
    trackingModel.set('page', {
      scope: 'insights',
      lens: 'home',
      report: '',
      depth: '',
      name: 'insights_home',
    });
    trackingModel.trigger('segment:page');
  }
}

/**
 * The analytics of the course table, with the names and properties of the legacy table. paged sends the 1-based
 * page number, as the legacy pager does (its collection's firstPage is 1). Opening a course sends the event that
 * js/views/tracking-view.js builds from the legacy link's data-track-* attributes
 * (course-list/list/templates/course-id-and-name-cell.underscore).
 */
export function createResultsTracker(trackingModel) {
  const track = (name, properties) => {
    if (trackingModel) {
      trackingModel.trigger('segment:track', name, properties);
    }
  };
  return {
    courseOpened: row => track('edx.bi.ui.menu.navigated', {
      type: 'click',
      text: `${row.catalog_course_title} | ${row.course_id}`,
      url: `/courses/${row.course_id}`,
      'target-scope': 'course',
      'target-lens': 'home',
      'menu-depth': 'insights',
      'link-name': 'course_row',
    }),
    // The legacy table's sort and page events (components/generic-list/list/views/table.js, paging-footer.js).
    sorted: (key, dir) => track('edx.bi.course_list.sorted', { category: `${key}_${dir}` }),
    paged: page => track('edx.bi.course_list.paged', { category: page }),
    // New with the Columns menu (no legacy event): which column was shown or hidden.
    columnsChanged: (id, shown) => track('edx.bi.course_list.columns_changed', {
      category: `${id}_${shown ? 'shown' : 'hidden'}`,
    }),
  };
}
