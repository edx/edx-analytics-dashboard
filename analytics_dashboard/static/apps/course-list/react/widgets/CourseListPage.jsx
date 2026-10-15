import PropTypes from 'prop-types';

import SectionBoundary from 'course-list/react/components/SectionBoundary';
import ErrorState from 'course-list/react/components/status/ErrorState';
import ControlsSection from 'course-list/react/widgets/ControlsSection';
import ResultsSection from 'course-list/react/widgets/ResultsSection';
import SummarySection from 'course-list/react/widgets/SummarySection';

/**
 * The course list page: the Performance summary and the Courses sections. Each section is wrapped in its own
 * boundary, so one that fails shows an error state while the others keep working. onSectionError(name, error)
 * is where the failure is reported.
 */
export default function CourseListPage({ onSectionError }) {
  const guard = (name, section) => (
    <SectionBoundary name={name} fallback={ErrorState} onError={onSectionError}>{section}</SectionBoundary>
  );

  return (
    <>
      <section className="insights-page-section" aria-labelledby="performance-summary-heading">
        <h2 id="performance-summary-heading" className="insights-section-heading">Performance summary</h2>
        {guard('course-list-summary', <SummarySection />)}
      </section>
      <section className="insights-page-section" aria-labelledby="courses-heading">
        <h2 id="courses-heading" className="insights-section-heading">Courses</h2>
        {guard('course-list-controls', <ControlsSection />)}
        {guard('course-list-results', <ResultsSection />)}
      </section>
    </>
  );
}

CourseListPage.propTypes = {
  onSectionError: PropTypes.func,
};

CourseListPage.defaultProps = {
  onSectionError: () => {},
};
