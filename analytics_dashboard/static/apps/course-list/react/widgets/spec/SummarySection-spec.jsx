import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import ParagonProvider from 'components/react/paragon/ParagonProvider';
import ignoreExpectedErrors from 'components/react/spec/ignore-expected-errors';
import SectionBoundary from 'course-list/react/components/SectionBoundary';
import { normalizeCourseRows } from 'course-list/react/platform/course-rows';
import { coursesFailed, coursesLoaded } from 'course-list/react/state/courses-slice';
import createCourseListStore from 'course-list/react/state/store';
import { summaryTextLoaded } from 'course-list/react/state/summary-slice';
import SummarySection from 'course-list/react/widgets/SummarySection';

const card = require('course-list/react/spec/fixtures/total-enrollment-card.json');
// The text of every card, as the server sends it.
const text = require('course-list/react/spec/fixtures/summary-text.json');

function Fallback() {
  return <p className="fallback">Error</p>;
}

describe('SummarySection', () => {
  let element;
  let root;
  let store;
  let restoreOnError;
  let onTooltipShown;

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

  it('has a card for each metric of the registry, in order, with the label from the page data', () => {
    dispatch(summaryTextLoaded(text));
    render(<SummarySection />);

    const labels = Array.prototype.map.call(element.querySelectorAll('.pgn__card .h4'), node => node.textContent);
    expect(labels).toEqual([
      'Total Enrollment', 'Current Enrollment', 'Total Engagements', 'Change in Last Week', 'Verified Enrollment',
      "Master's Enrollment",
    ]);
    expect(element.querySelectorAll('.insights-summary-cards > .insights-summary-col > .pgn__card').length).toBe(6);
  });

  it('shows every card\'s number from the course rows, and "--" for Total Engagements while the API has no data', () => {
    dispatch(summaryTextLoaded(text));
    // Normalized as the page-model bridge stores them.
    dispatch(coursesLoaded({
      rows: normalizeCourseRows([
        {
          course_id: 'a',
          cumulative_count: 1200,
          count: 900,
          count_change_7_days: -3,
          enrollment_modes: { verified: { count: 40 }, masters: { count: 5 } },
        },
        {
          course_id: 'b', cumulative_count: 300, count: 100, count_change_7_days: 8,
        },
      ]),
      programs: [],
    }));
    render(<SummarySection />);

    const numbers = Array.prototype.map.call(element.querySelectorAll('.pgn__card .h2'), node => node.textContent);
    expect(numbers).toEqual(['1,500', '1,000', '--Data not available yet', '5', '40', '5']);
  });

  it('shows the Total Engagements number once a course row has it', () => {
    dispatch(summaryTextLoaded(text));
    dispatch(coursesLoaded({ rows: normalizeCourseRows([{ course_id: 'a', total_engagements: 2500 }]), programs: [] }));
    render(<SummarySection />);

    expect(element.querySelectorAll('.pgn__card .h2')[2].textContent).toBe('2,500');
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
    expect(tooltips()[0].textContent).toBe(text.total_enrollment.tooltip);
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
