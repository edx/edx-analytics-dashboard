import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import {
  Card, Icon, IconButton, OverlayTrigger, Tooltip,
} from '@openedx/paragon';
import { InfoOutline } from '@openedx/paragon/icons';

import messages from 'course-list/react/components/messages';
import { formatSummaryNumber } from 'course-list/react/platform/format';

/**
 * A summary card of the course list: a big number, its label, and a help icon that shows a tooltip.
 * Built with Paragon, like the micro-frontends. The number is formatted like the legacy card
 * (templates/summary_point.html): thousands separators, and cut to 13 characters with the full number in the title.
 */
export default function SummaryCard({
  value, label, tooltip, tooltipId, onTooltipShown,
}) {
  const intl = useIntl();
  const { full, display } = formatSummaryNumber(value);

  return (
    <Card className="w-100">
      {/* Card.Section sets its own text alignment, so the centring goes on it, not on the card. */}
      <Card.Section className="position-relative text-center py-3">
        <div className="position-absolute" style={{ top: 0, right: 0 }}>
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
              src={InfoOutline}
              iconAs={Icon}
              alt={intl.formatMessage(messages.helpLabel, { label })}
              size="sm"
            />
          </OverlayTrigger>
        </div>
        <div className="h2 font-weight-normal mb-1" title={full}>{display}</div>
        <div className="h4 font-weight-normal mb-0">{label}</div>
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
