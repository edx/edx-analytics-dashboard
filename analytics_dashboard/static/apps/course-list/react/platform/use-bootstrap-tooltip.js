import { useEffect } from 'react';
import $ from 'jquery';

/**
 * Activates the Bootstrap 3 tooltip on an element rendered by React, and removes it on unmount.
 * Uses the plugin application-main.js already loads on every page; doesn't import Bootstrap again.
 * Legacy markup is activated by load/init-tooltips.js, which runs once at page load and never sees
 * React-rendered elements. Tooltip tracking keeps working because TrackingView listens for
 * 'shown.bs.tooltip' on the whole document (js/views/tracking-view.js).
 */
export default function useBootstrapTooltip(ref, title) {
  useEffect(() => {
    if (!$.fn.tooltip) {
      return undefined;
    }
    const $element = $(ref.current);
    $element.tooltip();
    return () => {
      $element.tooltip('destroy');
    };
  }, [ref, title]);
}
