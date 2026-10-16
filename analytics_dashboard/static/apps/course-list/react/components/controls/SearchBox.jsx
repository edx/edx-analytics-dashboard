import { useRef } from 'react';
import PropTypes from 'prop-types';
import { Form, Icon, IconButton } from '@openedx/paragon';
import { Close, Search } from '@openedx/paragon/icons';

// The longest search: the page's address keeps the search text, and a longer one is cut when the address is read.
const MAX_SEARCH_LENGTH = 200;

/**
 * A search box as in the prototype: a Paragon Form.Control with a search icon on the left and, when clearable and
 * there is text, a button that clears it. It is the "Find a course" box of the filter bar, and the search of the long
 * filter menus. It reports every change of the text; onSubmit is called when Enter is pressed. Clearing puts the focus
 * back in the box (the clear button goes away). landmark makes it the page's search landmark (role="search"): only
 * the bar's is, so an open menu doesn't add a second one.
 */
export default function SearchBox({
  value, onChange, onSubmit, label, clearable, className, landmark,
}) {
  const input = useRef(null);
  return (
    <Form
      role={landmark ? 'search' : undefined}
      className={`insights-search-box ${className}`.trim()}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      <Form.Control
        ref={input}
        type="search"
        value={value}
        placeholder={label}
        aria-label={label}
        maxLength={MAX_SEARCH_LENGTH}
        onChange={event => onChange(event.target.value)}
        leadingElement={<Icon src={Search} className="insights-search-icon" />}
        trailingElement={clearable && value ? (
          <IconButton
            src={Close}
            iconAs={Icon}
            alt="Clear search"
            size="inline"
            className="insights-search-clear"
            onClick={() => {
              onChange('');
              if (input.current) {
                input.current.focus();
              }
            }}
          />
        ) : null}
      />
    </Form>
  );
}

SearchBox.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  label: PropTypes.string,
  clearable: PropTypes.bool,
  className: PropTypes.string,
  landmark: PropTypes.bool,
};

SearchBox.defaultProps = {
  onSubmit: () => {},
  label: 'Find a course',
  clearable: true,
  className: '',
  landmark: true,
};
