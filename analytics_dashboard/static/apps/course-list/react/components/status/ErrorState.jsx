/**
 * Shown in place of a section that failed to render. The markup is that of Insights' error alert
 * (templates/section_error.html and components/alert), so it looks like every other error on the site.
 */
export default function ErrorState() {
  return (
    <div className="alert alert-error" role="alert">
      <span className="icon alert-icon fa fa-warning" aria-hidden="true" />
      <div className="alert-message">
        <h3 className="alert-title">We are unable to load this section.</h3>
        <p className="alert-copy-with-title">Reload the page to try again.</p>
      </div>
    </div>
  );
}
