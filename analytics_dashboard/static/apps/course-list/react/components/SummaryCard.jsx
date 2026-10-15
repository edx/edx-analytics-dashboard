import PropTypes from 'prop-types';
import {
  Card, Icon, IconButton, OverlayTrigger, Tooltip,
} from '@openedx/paragon';
import { Info } from '@openedx/paragon/icons';

import { formatSummaryNumber } from 'course-list/react/platform/format';

/**
 * A summary card of the course list: a big number, its label, and a help icon that shows a tooltip.
 * Built with Paragon, like the micro-frontends. The number is formatted like the legacy card
 * (templates/summary_point.html): thousands separators, and cut to 13 characters with the full number in the title.
 */
export default function SummaryCard({
  value, label, tooltip, tooltipId, onTooltipShown,
}) {
  const { full, display } = formatSummaryNumber(value);

  return (
    <Card className="w-100 insights-summary-card">
      {/* Card.Section sets its own text alignment, so the centring goes on it, not on the card. */}
      <Card.Section className="position-relative text-center insights-summary-card-section">
        <div className="position-absolute insights-summary-help">
          <OverlayTrigger
            placement="top"
            onToggle={(shown) => {
              if (shown) {
                onTooltipShown(label);
              }
            }}
            overlay={<Tooltip id={tooltipId}>{tooltip}</Tooltip>}
          >
            <IconButton
              src={Info}
              iconAs={Icon}
              alt={`${label} help`}
              size="sm"
              className="insights-help-icon"
            />
          </OverlayTrigger>
        </div>
        <div className="h2 insights-summary-number" title={full}>{display}</div>
        <div className="h4 insights-summary-label">{label}</div>
        {/* Like the legacy card: screen readers get the description without having to open the tooltip. */}
        <span className="sr-only">{tooltip}</span>
      </Card.Section>
    </Card>
  );
}

SummaryCard.propTypes = {
  value: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
  tooltip: PropTypes.string.isRequired,
  // Must be unique on the page: it links the tooltip to its icon for screen readers.
  tooltipId: PropTypes.string.isRequired,
  // Called with the label when the tooltip is shown, for analytics.
  onTooltipShown: PropTypes.func.isRequired,
};
