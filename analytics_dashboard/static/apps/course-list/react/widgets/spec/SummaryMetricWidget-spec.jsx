import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';

import mountReact from 'components/react/mount-react';
import { resetMonitoringForTests } from 'components/react/monitoring';
import ParagonProvider from 'components/react/paragon/ParagonProvider';
import ignoreExpectedErrors from 'components/react/spec/ignore-expected-errors';
import createCourseListStore from 'course-list/react/state/store';
import { summaryLoaded } from 'course-list/react/state/summary-slice';
import SummaryMetricWidget from 'course-list/react/widgets/SummaryMetricWidget';

const card = require('course-list/react/spec/fixtures/total-enrollment-card.json');

const NO_DATA_MESSAGE = 'Summary metric data is not available.';
const SERVER_CARD = '<div class="summary-point text-center"><div class="summary-point-wrapper">'
  + '<div class="summary-point-number" title="1,234">1,234</div>'
  + '<div class="summary-point-label">Total Enrollment</div>'
  + '</div></div>';

// mountReact restores the HTML in a microtask scheduled during React's commit; these run after it.
const afterRestore = (assertions, done) => {
  Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => {
      assertions();
      done();
    })
    .catch(done.fail);
};

describe('SummaryMetricWidget', () => {
  const text = { label: card.label, tooltip: card.tooltip };
  let element;
  let store;
  let onTooltipShown;

  const loadValue = (metric, value, metricText = text) => {
    store.dispatch(summaryLoaded({ metrics: { [metric]: value }, text: { [metric]: metricText } }));
  };
  const number = () => element.querySelector('.h2');

  beforeEach(() => {
    setFixtures(`<div id="summary-metric" data-react-widget="summary-metric">${SERVER_CARD}</div>`);
    element = document.getElementById('summary-metric');
    store = createCourseListStore();
    onTooltipShown = jasmine.createSpy('onTooltipShown');
  });

  describe('with loaded data', () => {
    let root;

    const renderWidget = (metric = 'totalEnrollment') => {
      act(() => {
        root.render(
          <Provider store={store}>
            <ParagonProvider>
              <SummaryMetricWidget metric={metric} onTooltipShown={onTooltipShown} />
            </ParagonProvider>
          </Provider>,
        );
      });
    };

    beforeEach(() => {
      root = createRoot(element);
    });

    afterEach(() => {
      act(() => root.unmount());
    });

    card.cases.forEach(({ value, title, display }) => {
      it(`renders the value ${value} from the store`, () => {
        loadValue('totalEnrollment', value);
        renderWidget();

        expect(number().getAttribute('title')).toBe(title);
        expect(number().textContent).toBe(display);
        expect(element.querySelector('.h4').textContent).toBe(card.label);
      });
    });

    it('renders any metric, with its own text', () => {
      loadValue('currentEnrollment', 1500, { label: 'Current Enrollment', tooltip: 'Current help.' });
      renderWidget('currentEnrollment');

      expect(number().textContent).toBe('1,500');
      expect(element.querySelector('.h4').textContent).toBe('Current Enrollment');
    });

    it('updates the number in place when the store changes', () => {
      const [first, second] = card.cases;
      loadValue('totalEnrollment', first.value);
      renderWidget();
      const numberNode = number();

      act(() => loadValue('totalEnrollment', second.value));

      expect(number()).toBe(numberNode);
      expect(numberNode.textContent).toBe(second.display);
      expect(numberNode.getAttribute('title')).toBe(second.title);
    });
  });

  describe('without loaded data', () => {
    let originalRum;
    let rum;
    let restoreOnError;

    beforeEach(() => {
      restoreOnError = ignoreExpectedErrors([NO_DATA_MESSAGE]);
      resetMonitoringForTests();
      originalRum = window.DD_RUM;
      rum = {
        addError: jasmine.createSpy('addError'),
        addAction: jasmine.createSpy('addAction'),
      };
      window.DD_RUM = rum;
      // React and the monitoring adapter log caught errors to the console in development builds.
      spyOn(console, 'error');
    });

    afterEach(() => {
      window.DD_RUM = originalRum;
      restoreOnError();
    });

    const mountWidget = () => {
      act(() => {
        mountReact(element, SummaryMetricWidget, {
          store,
          wrapper: ParagonProvider,
          props: { metric: 'totalEnrollment', onTooltipShown },
        });
      });
    };

    it('throws, so mountReact keeps the server-rendered card', (done) => {
      const serverHtml = element.innerHTML;

      mountWidget();

      afterRestore(() => {
        expect(element.innerHTML).toBe(serverHtml);
        expect(element.textContent).not.toContain(NO_DATA_MESSAGE);
        expect(rum.addError.calls.argsFor(0)[1]['insights.react.failure_type']).toBe('render_error');
        expect(rum.addError.calls.argsFor(0)[1]['insights.react.widget']).toBe('summary-metric');
      }, done);
    });

    it('throws when only the value is loaded, without its text', (done) => {
      const serverHtml = element.innerHTML;
      store.dispatch(summaryLoaded({ metrics: { totalEnrollment: 10 }, text: {} }));

      mountWidget();

      afterRestore(() => {
        expect(element.innerHTML).toBe(serverHtml);
      }, done);
    });
  });
});
