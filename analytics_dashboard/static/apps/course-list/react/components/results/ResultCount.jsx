import PropTypes from 'prop-types';

import { formatCount } from 'course-list/react/platform/format';

/** "Course runs: N". A polite live region, so screen readers hear the new count after a search or filter. */
export default function ResultCount({ count }) {
  return (
    <span className="insights-result-count" aria-live="polite">
      {`Course runs: ${formatCount(count)}`}
    </span>
  );
}

ResultCount.propTypes = {
  count: PropTypes.number.isRequired,
};
