import PropTypes from 'prop-types';
import { Dropdown } from '@openedx/paragon';
import { ArrowDropDown } from '@openedx/paragon/icons';

// The menu opens 4px under its button, as the prototype's panels do.
const POPPER_CONFIG = { modifiers: [{ name: 'offset', options: { offset: [0, 4] } }] };

/**
 * The button and menu that every dropdown of the course list shares (the filters, Timeframe and Columns): a Paragon
 * Dropdown whose toggle is the neutral outline-secondary button, themed as Insights' default button (see
 * .insights-default-button in insights-theme.css), with Paragon's ArrowDropDown as the caret. icon is an optional
 * icon component before the label; onToggle(isOpen) is called when the menu opens or closes.
 */
export default function FilterDropdown({
  id, label, icon, menuClassName, onToggle, children,
}) {
  return (
    <Dropdown onToggle={onToggle}>
      <Dropdown.Toggle
        id={`${id}-toggle`}
        variant="outline-secondary"
        className="insights-filter-toggle insights-default-button"
        iconBefore={icon || undefined}
        iconAfter={ArrowDropDown}
      >
        {label}
      </Dropdown.Toggle>
      <Dropdown.Menu className={`insights-checkbox-menu ${menuClassName}`.trim()} popperConfig={POPPER_CONFIG}>
        {children}
      </Dropdown.Menu>
    </Dropdown>
  );
}

FilterDropdown.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  menuClassName: PropTypes.string,
  onToggle: PropTypes.func,
  children: PropTypes.node.isRequired,
};

FilterDropdown.defaultProps = {
  icon: null,
  menuClassName: '',
  onToggle: () => {},
};
