import PropTypes from 'prop-types';
import { Button } from '@openedx/paragon';
import { Download } from '@openedx/paragon/icons';

/** A link to the CSV of the course list. */
export default function DownloadCsvButton({ url, onClick }) {
  return (
    <Button as="a" href={url} variant="outline-primary" iconBefore={Download} onClick={onClick}>
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
