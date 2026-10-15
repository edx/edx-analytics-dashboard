import { useRef } from 'react';
import PropTypes from 'prop-types';

import { formatSummaryNumber } from 'course-list/react/platform/format';
import useBootstrapTooltip from 'course-list/react/platform/use-bootstrap-tooltip';

/**
 * React version of templates/summary_point.html (value, label and tooltip). It renders the same markup,
 * classes and attributes, so the existing .summary-point styles (sass/_base.scss) and tooltip tracking
 * apply unchanged.
 */
export default function SummaryCard({ value, label, tooltip }) {
  const tooltipRef = useRef(null);
  useBootstrapTooltip(tooltipRef, tooltip);
  const { full, display } = formatSummaryNumber(value);

  return (
    <div className="summary-point text-center">
      <div className="summary-point-wrapper">
        <div className="summary-point-number" title={full}>{display}</div>
        <div className="summary-point-label">{label}</div>
        <div className="summary-point-help">
          <span className="sr-only">{tooltip}</span>
          <span
            ref={tooltipRef}
            data-toggle="tooltip"
            data-placement="top"
            title={tooltip}
            data-track-event="edx.bi.tooltip.displayed"
            data-track-title={label}
            data-track-category="summary"
            data-track-type="tooltip"
            className="ico ico-tooltip fa fa-info-circle has-tooltip"
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}

SummaryCard.propTypes = {
  value: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
  tooltip: PropTypes.string.isRequired,
};
