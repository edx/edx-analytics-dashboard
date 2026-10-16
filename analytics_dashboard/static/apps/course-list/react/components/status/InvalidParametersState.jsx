/**
 * Shown instead of the results when the address of the page has a parameter that can't be used, with the message and
 * the link of the legacy page (course-list/app/controller.js). The markup is that of Insights' error alert, as in
 * ErrorState. The link opens the plain address of the course list.
 */
export default function InvalidParametersState() {
  return (
    <div className="alert alert-error" role="alert">
      <span className="icon alert-icon fa fa-warning" aria-hidden="true" />
      <div className="alert-message">
        <h3 className="alert-title">Invalid Parameters</h3>
        <p className="alert-copy-with-title">
          Sorry, we couldn&apos;t find any courses that matched that query.
          {' '}
          <a href="/courses/">Return to the Course List page.</a>
        </p>
      </div>
    </div>
  );
}
