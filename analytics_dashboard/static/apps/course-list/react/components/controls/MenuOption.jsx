import PropTypes from 'prop-types';
import { Form } from '@openedx/paragon';

/**
 * One checkbox option of a dropdown menu (a filter, Columns): a Paragon Form.Checkbox on one line, drawn like the
 * prototype's (see .insights-checkbox-menu in insights-theme.css). Paragon gives the input its id and ties the label
 * to it. A label too long for the menu is cut off with an ellipsis; hovering it shows the full text. Timeframe's radios
 * are Paragon Form.Radio, in TimeframeDropdown, with the same look.
 */
export default function MenuOption({ label, checked, onChange }) {
  return (
    <Form.Checkbox className="insights-menu-option" checked={checked} onChange={onChange}>
      <span title={label}>{label}</span>
    </Form.Checkbox>
  );
}

MenuOption.propTypes = {
  label: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};
