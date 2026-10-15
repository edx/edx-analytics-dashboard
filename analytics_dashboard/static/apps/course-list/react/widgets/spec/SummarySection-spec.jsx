import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import ParagonProvider from 'components/react/paragon/ParagonProvider';
import ignoreExpectedErrors from 'components/react/spec/ignore-expected-errors';
import SectionBoundary from 'course-list/react/components/SectionBoundary';
import { coursesFailed, coursesLoaded } from 'course-list/react/state/courses-slice';
import createCourseListStore from 'course-list/react/state/store';
import { summaryTextLoaded } from 'course-list/react/state/summary-slice';
import SummarySection from 'course-list/react/widgets/SummarySection';

const card = require('course-list/react/spec/fixtures/total-enrollment-card.json');

function Fallback() {
  return <p className="fallback">Error</p>;
}

describe('SummarySection', () => {
  let element;
  let root;
  let store;
  let restoreOnError;
  let onTooltipShown;
  const text = { total_enrollment: { label: card.label, tooltip: card.tooltip } };

  const render = (content) => {
    act(() => {
      root.render(<Provider store={store}><ParagonProvider>{content}</ParagonProvider></Provider>);
    });
  };
  const dispatch = (action) => {
    act(() => {
      store.dispatch(action);
    });
  };
  // Only Paragon's tooltips: other specs can leave legacy Bootstrap 3 tooltips (.tooltip) in the body.
  const tooltips = () => document.querySelectorAll('.tooltip[class*="bs-tooltip-"]');

  beforeEach(() => {
    restoreOnError = ignoreExpectedErrors(['Summary text is not available.', 'Course data is not valid.']);
    // React logs errors that an error boundary caught to the console in development builds.
    spyOn(console, 'error');
    onTooltipShown = jasmine.createSpy('onTooltipShown');
    setFixtures('<div id="summary-section-root"></div>');
    element = document.getElementById('summary-section-root');
    root = createRoot(element);
    store = createCourseListStore();
  });

  afterEach(() => {
    act(() => root.unmount());
    Array.prototype.forEach.call(tooltips(), (tooltip) => {
      tooltip.parentNode.removeChild(tooltip);
    });
    restoreOnError();
  });

  it('has a card for each metric of the registry, with the label from the page data', () => {
    dispatch(summaryTextLoaded(text));
    render(<SummarySection />);

    expect(element.querySelectorAll('.pgn__card').length).toBe(1);
    expect(element.querySelector('.h4').textContent).toBe(card.label);
  });

  it('shows the total of the course rows', () => {
    dispatch(summaryTextLoaded(text));
    dispatch(coursesLoaded({
      rows: [{ course_id: 'a', cumulative_count: 1200 }, { course_id: 'b', cumulative_count: 300 }],
      programs: [],
    }));
    render(<SummarySection />);

    expect(element.querySelector('.h2').textContent).toBe('1,500');
    expect(element.querySelector('.h2').getAttribute('title')).toBe('1,500');
  });

  it('shows 0 when there are no course rows', () => {
    dispatch(summaryTextLoaded(text));
    render(<SummarySection />);

    expect(element.querySelector('.h2').textContent).toBe('0');
  });

  it('updates the number when the rows change', () => {
    dispatch(summaryTextLoaded(text));
    dispatch(coursesLoaded({ rows: [{ course_id: 'a', cumulative_count: 10 }], programs: [] }));
    render(<SummarySection />);

    dispatch(coursesLoaded({ rows: [{ course_id: 'a', cumulative_count: 25 }], programs: [] }));

    expect(element.querySelector('.h2').textContent).toBe('25');
  });

  it('tells onTooltipShown the label of the card when its tooltip is shown', () => {
    dispatch(summaryTextLoaded(text));
    render(<SummarySection onTooltipShown={onTooltipShown} />);
    const event = document.createEvent('Event');
    event.initEvent('mouseover', true, true);

    act(() => {
      element.querySelector('button').dispatchEvent(event);
    });

    expect(tooltips().length).toBe(1);
    expect(tooltips()[0].textContent).toBe(card.tooltip);
    expect(onTooltipShown).toHaveBeenCalledWith(card.label);
  });

  it('throws when the course data is malformed, instead of showing a number', () => {
    dispatch(summaryTextLoaded(text));
    dispatch(coursesFailed());

    render(<SectionBoundary name="summary" fallback={Fallback}><SummarySection /></SectionBoundary>);

    expect(element.querySelector('.fallback')).not.toBeNull();
    expect(element.querySelector('.pgn__card')).toBeNull();
  });

  it('throws when the server sent no text for a card, so its section shows the error state', () => {
    const onError = jasmine.createSpy('onError');

    render(<SectionBoundary name="summary" fallback={Fallback} onError={onError}><SummarySection /></SectionBoundary>);

    expect(element.querySelector('.fallback')).not.toBeNull();
    expect(element.querySelector('.pgn__card')).toBeNull();
    expect(onError.calls.argsFor(0)[1].message).toBe('Summary text is not available.');
  });

  it('throws when the text of a card has no label or no tooltip', () => {
    dispatch(summaryTextLoaded({ total_enrollment: { label: 'Total Enrollment' } }));

    render(<SectionBoundary name="summary" fallback={Fallback}><SummarySection /></SectionBoundary>);

    expect(element.querySelector('.fallback')).not.toBeNull();
  });
});
