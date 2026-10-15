import PropTypes from 'prop-types';
import { Form } from '@openedx/paragon';

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
