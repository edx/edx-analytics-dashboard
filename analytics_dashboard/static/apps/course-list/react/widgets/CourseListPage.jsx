import PropTypes from 'prop-types';

import SectionBoundary from 'course-list/react/components/SectionBoundary';
import ErrorState from 'course-list/react/components/status/ErrorState';
import ControlsSection from 'course-list/react/widgets/ControlsSection';
import ResultsSection from 'course-list/react/widgets/ResultsSection';
import SummarySection from 'course-list/react/widgets/SummarySection';

// The layout: the Performance summary and the Courses sections. Each section is wrapped in its own boundary, so
// one that fails shows an error state while the others keep working.
function PageLayout({ onSectionError, onTooltipShown }) {
  const guard = (name, section) => (
    <SectionBoundary name={name} fallback={ErrorState} onError={onSectionError}>{section}</SectionBoundary>
  );

  return (
    <>
      <section className="insights-page-section" aria-labelledby="performance-summary-heading">
        <h2 id="performance-summary-heading" className="insights-section-heading">Performance summary</h2>
        {guard('course-list-summary', <SummarySection onTooltipShown={onTooltipShown} />)}
      </section>
      <section className="insights-page-section" aria-labelledby="courses-heading">
        <h2 id="courses-heading" className="insights-section-heading">Courses</h2>
        {guard('course-list-controls', <ControlsSection />)}
        {guard('course-list-results', <ResultsSection />)}
      </section>
    </>
  );
}

PageLayout.propTypes = {
  onSectionError: PropTypes.func,
  onTooltipShown: PropTypes.func,
};

PageLayout.defaultProps = {
  onSectionError: () => {},
  onTooltipShown: () => {},
};

/**
 * The course list page. The layout is wrapped in a boundary too, so a failure of the layout itself shows the error
 * state instead of leaving the spinner on screen. onSectionError(name, error) is where failures are reported,
 * and onTooltipShown(label) where the showing of a summary card's tooltip is.
 */
export default function CourseListPage({ onSectionError, onTooltipShown }) {
  return (
    <SectionBoundary name="course-list" fallback={ErrorState} onError={onSectionError}>
      <PageLayout onSectionError={onSectionError} onTooltipShown={onTooltipShown} />
    </SectionBoundary>
  );
}

CourseListPage.propTypes = {
  onSectionError: PropTypes.func,
  onTooltipShown: PropTypes.func,
};

CourseListPage.defaultProps = {
  onSectionError: () => {},
  onTooltipShown: () => {},
};
