import PropTypes from 'prop-types';
import { Form } from '@openedx/paragon';

// The longest search: the page's address keeps the search text, and a longer one is cut when the address is read.
const MAX_SEARCH_LENGTH = 200;

/** The "Find a course" box. It reports every change of the text; onSubmit is called when Enter is pressed. */
export default function SearchBox({ value, onChange, onSubmit }) {
  return (
    <Form
      role="search"
      className="insights-search-box"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      <Form.Control
        type="search"
        value={value}
        placeholder="Find a course"
        aria-label="Find a course"
        maxLength={MAX_SEARCH_LENGTH}
        onChange={event => onChange(event.target.value)}
      />
    </Form>
  );
}

SearchBox.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
};

SearchBox.defaultProps = {
  onSubmit: () => {},
};
