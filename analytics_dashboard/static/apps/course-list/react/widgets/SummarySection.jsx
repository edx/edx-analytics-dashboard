import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import SummaryCard from 'course-list/react/components/SummaryCard';
import { selectStatus } from 'course-list/react/state/courses-slice';
import { selectSummaryMetrics } from 'course-list/react/state/selectors';
import { selectSummaryText } from 'course-list/react/state/summary-slice';

/**
 * The cards of the Performance summary: one for each entry of the metrics registry (registries/metrics.js), with
 * the number computed from the course rows and the label and tooltip from the page data. It throws, so that its
 * boundary shows the error state, when the course data is malformed or the text of a card is missing: it never shows
 * a made-up number or a card without a label.
 */
export default function SummarySection({ onTooltipShown }) {
  const metrics = useSelector(selectSummaryMetrics);
  const text = useSelector(selectSummaryText);
  const status = useSelector(selectStatus);
  if (status === 'error') {
    throw new Error('Course data is not valid.');
  }

  return (
    <div className="row">
      {metrics.map(({ id, textKey, value }) => {
        const { label, tooltip } = text[textKey] || {};
        if (typeof label !== 'string' || typeof tooltip !== 'string') {
          // The server sent no text for this card. Throwing lets this section's boundary show the error state
          // instead of a card without a label. The message is fixed and contains no data.
          throw new Error('Summary text is not available.');
        }
        return (
          <div key={id} className="col-12 col-md-3">
            <SummaryCard
              value={value}
              label={label}
              tooltip={tooltip}
              tooltipId={`summary-tooltip-${id}`}
              onTooltipShown={onTooltipShown}
            />
          </div>
        );
      })}
    </div>
  );
}

SummarySection.propTypes = {
  // Called with a card's label when its tooltip is shown, for analytics.
  onTooltipShown: PropTypes.func,
};

SummarySection.defaultProps = {
  onTooltipShown: () => {},
};
