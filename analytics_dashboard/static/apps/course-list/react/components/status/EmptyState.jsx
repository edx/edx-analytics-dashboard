import PropTypes from 'prop-types';

/** Shown instead of the results when there is nothing to show. */
export default function EmptyState({ message, detail }) {
  return (
    <div className="insights-empty-state" role="status">
      <p className="insights-empty-state-message">{message}</p>
      {detail && <p>{detail}</p>}
    </div>
  );
}

EmptyState.propTypes = {
  message: PropTypes.string.isRequired,
  detail: PropTypes.string,
};

EmptyState.defaultProps = {
  detail: '',
};
