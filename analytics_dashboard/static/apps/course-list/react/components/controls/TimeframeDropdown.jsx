import PropTypes from 'prop-types';
import { Form } from '@openedx/paragon';

import FilterDropdown from 'course-list/react/components/controls/FilterDropdown';

// The ranges of the prototype's Timeframe menu, in its order. Custom adds a From and a To date.
export const TIMEFRAME_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '60d', label: 'Last 60 days' },
  { value: 'custom', label: 'Custom' },
];

// Today in the user's time zone as YYYY-MM-DD, the latest date that can be picked (not the UTC date, which is a day
// off in the evening west of UTC and in the morning east of it).
const pad = number => (number < 10 ? `0${number}` : String(number));
export const today = (now = new Date()) => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

/**
 * The Timeframe menu, built from Paragon form parts: a Form.RadioSet with one Form.Radio per range, and with Custom
 * the From and To dates (Form.Group, Form.Label, Form.Control; From never after To, neither after today). value is
 * { range, from, to }; onChange is called with the new one (choosing a preset clears the dates).
 */
export default function TimeframeDropdown({ value, onChange }) {
  const { range, from, to } = value;
  const choose = next => onChange(next === 'custom' ? { range: 'custom', from, to } : { range: next, from: '', to: '' });
  // min and max only limit the date picker: a typed date can still contradict the other one. Then the date just set
  // wins and the other is cleared, so From is never after To.
  const setDate = (field, date) => {
    const next = { ...value, [field]: date };
    if (next.from && next.to && next.from > next.to) {
      next[field === 'from' ? 'to' : 'from'] = '';
    }
    onChange(next);
  };
  const dateField = (field, label, props) => (
    <Form.Group controlId={`timeframe-${field}`} className="insights-timeframe-date">
      <Form.Label>{label}</Form.Label>
      <Form.Control
        type="date"
        className={value[field] ? '' : 'is-empty'}
        value={value[field]}
        max={today()}
        onChange={event => setDate(field, event.target.value)}
        {...props}
      />
    </Form.Group>
  );

  return (
    <FilterDropdown id="timeframe" label="Timeframe" menuClassName="insights-timeframe-menu">
      <Form.RadioSet name="insights-timeframe" aria-label="Timeframe" value={range} onChange={event => choose(event.target.value)}>
        {TIMEFRAME_RANGES.map(option => (
          <Form.Radio key={option.value} value={option.value} className="insights-menu-option">
            <span title={option.label}>{option.label}</span>
          </Form.Radio>
        ))}
      </Form.RadioSet>
      {range === 'custom' && (
        <div className="insights-timeframe-dates">
          {dateField('from', 'From', { max: to || today() })}
          {dateField('to', 'To', { min: from || undefined })}
        </div>
      )}
    </FilterDropdown>
  );
}

TimeframeDropdown.propTypes = {
  value: PropTypes.shape({
    range: PropTypes.string.isRequired,
    from: PropTypes.string.isRequired,
    to: PropTypes.string.isRequired,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};
