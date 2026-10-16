import PropTypes from 'prop-types';
import { Button } from '@openedx/paragon';

import { DownloadSharp } from 'course-list/react/components/icons';

/**
 * A link to the CSV of the course list: a Paragon Button drawn as Insights' default button (the neutral
 * outline-secondary variant, themed in insights-theme.css) with the prototype's download icon.
 */
export default function DownloadCsvButton({ url, onClick }) {
  return (
    <Button
      as="a"
      href={url}
      variant="outline-secondary"
      className="insights-default-button"
      iconBefore={DownloadSharp}
      onClick={onClick}
    >
      Download CSV
    </Button>
  );
}

DownloadCsvButton.propTypes = {
  url: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

DownloadCsvButton.defaultProps = {
  onClick: () => {},
};
