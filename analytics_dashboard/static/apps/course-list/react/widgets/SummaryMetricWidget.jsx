import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import SummaryCard from 'course-list/react/components/SummaryCard';
import { selectSummaryMetric, selectSummaryText } from 'course-list/react/state/summary-slice';

/**
 * A card of the "across all your courses" summary row, connected to the Redux store. One widget serves every
 * card: `metric` is the key of its number and text in the store ('totalEnrollment', 'currentEnrollment', ...).
 */
export default function SummaryMetricWidget({ metric, onTooltipShown }) {
  const value = useSelector(state => selectSummaryMetric(state, metric));
  const text = useSelector(state => selectSummaryText(state, metric));
  if (value === undefined || text === undefined) {
    // No valid data has ever been loaded. Throwing lets the error boundary keep the server-rendered card
    // instead of showing a made-up value. The message is fixed and contains no data.
    throw new Error('Summary metric data is not available.');
  }
  return (
    <SummaryCard
      value={value === null ? 0 : value}
      label={text.label}
      tooltip={text.tooltip}
      tooltipId={`summary-tooltip-${metric}`}
      onTooltipShown={onTooltipShown}
    />
  );
}

SummaryMetricWidget.propTypes = {
  metric: PropTypes.string.isRequired,
  onTooltipShown: PropTypes.func.isRequired,
};
