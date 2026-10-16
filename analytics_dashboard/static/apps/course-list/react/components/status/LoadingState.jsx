import { Spinner } from '@openedx/paragon';

/** Shown while the course data isn't ready. */
export default function LoadingState() {
  return (
    <div className="insights-loading-state text-center">
      <Spinner animation="border" size="sm" screenReaderText="Loading" />
      {' '}
      <span aria-hidden="true">Loading</span>
    </div>
  );
}
