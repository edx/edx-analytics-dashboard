import { Button } from '@openedx/paragon';

/** Shown in place of a section that failed to render. */
export default function ErrorState() {
  return (
    <div className="insights-error-state" role="alert">
      <p>Something went wrong loading this section.</p>
      <Button variant="outline-primary" onClick={() => window.location.reload()}>Reload page</Button>
    </div>
  );
}
