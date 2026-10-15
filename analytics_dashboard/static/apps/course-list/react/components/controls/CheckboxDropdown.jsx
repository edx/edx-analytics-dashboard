import PropTypes from 'prop-types';
import { Dropdown, Form } from '@openedx/paragon';

/**
 * A button that opens a menu of checkboxes: the sample for every multiple-choice filter, and the Columns menu.
 * onChange is called with the new list of selected values. The button shows how many values are selected, unless
 * showCount is false; icon is an optional Paragon icon before the label.
 */
export default function CheckboxDropdown({
  id, label, options, selected, onChange, icon, showCount,
}) {
  // The new selection is kept in the order of the options, so the analytics value does not depend on the clicks.
  const toggle = (value, checked) => onChange(
    options.map(option => option.value)
      .filter(item => (item === value ? checked : selected.indexOf(item) !== -1)),
  );

  return (
    <Dropdown>
      <Dropdown.Toggle id={`${id}-toggle`} variant="outline-primary" iconBefore={icon || undefined}>
        {showCount && selected.length ? `${label} (${selected.length})` : label}
      </Dropdown.Toggle>
      <Dropdown.Menu className="insights-checkbox-menu">
        {options.map(option => (
          <Form.Checkbox
            key={option.value}
            checked={selected.indexOf(option.value) !== -1}
            onChange={event => toggle(option.value, event.target.checked)}
          >
            {option.label}
          </Form.Checkbox>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}

CheckboxDropdown.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  })).isRequired,
  selected: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  icon: PropTypes.elementType,
  showCount: PropTypes.bool,
};

CheckboxDropdown.defaultProps = {
  icon: null,
  showCount: true,
};
