import { act, version as reactVersion } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';
import $ from 'jquery';

import mountReact from 'components/react/mount-react';
import { resetMonitoringForTests } from 'components/react/monitoring';
import ignoreExpectedErrors from 'components/react/spec/ignore-expected-errors';

const SERVER_CARD = '<div class="summary-point text-center"><div class="summary-point-wrapper">'
  + '<div class="summary-point-number" title="1,234">1,234</div>'
  + '<div class="summary-point-help"><span class="sr-only">Help text</span>'
  + '<span class="ico ico-tooltip fa fa-info-circle has-tooltip" title="Help text" aria-hidden="true"></span>'
  + '</div></div></div>';

function AlwaysFails() {
  throw new Error('render failed');
}

function ValueCard() {
  const value = useSelector(state => state.value);
  if (value === 'fail') {
    throw new Error('render failed');
  }
  return (
    <div className="summary-point text-center">
      <div className="summary-point-wrapper">
        <div className="summary-point-number" title={value}>{value}</div>
      </div>
    </div>
  );
}

const createValueStore = () => configureStore({
  reducer: (state, action) => (action.type === 'set' ? { value: action.value } : state),
  preloadedState: { value: 'A' },
});

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

describe('WidgetErrorBoundary with mountReact', () => {
  let element;
  let originalRum;
  let rum;
  let restoreOnError;

  beforeEach(() => {
    restoreOnError = ignoreExpectedErrors(['render failed']);
    resetMonitoringForTests();
    originalRum = window.DD_RUM;
    rum = {
      addError: jasmine.createSpy('addError'),
      addAction: jasmine.createSpy('addAction'),
    };
    window.DD_RUM = rum;
    // React and the monitoring adapter log caught errors to the console in development builds.
    spyOn(console, 'error');
    setFixtures(`<div id="mount-point" class="col col-12" data-react-widget="test-widget">${SERVER_CARD}</div>`);
    element = document.getElementById('mount-point');
    // On the page, load/init-tooltips.js activates the server-rendered tooltips before React mounts.
    $(element).find('.has-tooltip').tooltip();
  });

  afterEach(() => {
    window.DD_RUM = originalRum;
    restoreOnError();
  });

  it('restores the server-rendered HTML exactly, without a wrapper, when the first render fails', (done) => {
    const serverHtml = element.innerHTML;

    act(() => {
      mountReact(element, AlwaysFails);
    });

    afterRestore(() => {
      expect(element.innerHTML).toBe(serverHtml);
      expect(element.children.length).toBe(1);
      expect(element.firstElementChild.className).toBe('summary-point text-center');
      expect(element.className).toBe('col col-12');
      expect(element.textContent).not.toContain('render failed');
    }, done);
  });

  it('re-activates the Bootstrap tooltip of the restored HTML', (done) => {
    act(() => {
      mountReact(element, AlwaysFails);
    });

    afterRestore(() => {
      expect($(element).find('.has-tooltip').data('bs.tooltip')).toBeDefined();
    }, done);
  });

  it('reports a render failure and a fallback to the server HTML', (done) => {
    act(() => {
      mountReact(element, AlwaysFails);
    });

    afterRestore(() => {
      expect(rum.addError).toHaveBeenCalledTimes(1);
      const [error, context] = rum.addError.calls.argsFor(0);
      expect(error.message).toBe('Insights React widget failed to render');
      expect(context['insights.react.widget']).toBe('test-widget');
      expect(context['insights.react.failure_type']).toBe('render_error');
      expect(context['insights.react.recovery']).toBe('server_html');
      expect(context['insights.react.library_version']).toBe(reactVersion);
      expect(rum.addAction).toHaveBeenCalledWith(
        'insights_react_fallback_activated',
        jasmine.objectContaining({ 'insights.react.fallback': 'server_html' }),
      );
    }, done);
  });

  it('restores the last successful render when a later update fails', (done) => {
    const store = createValueStore();
    act(() => {
      mountReact(element, ValueCard, { store });
    });
    act(() => {
      store.dispatch({ type: 'set', value: 'B' });
    });
    const lastRenderedHtml = element.innerHTML;
    expect(element.textContent).toBe('B');

    act(() => {
      store.dispatch({ type: 'set', value: 'fail' });
    });

    afterRestore(() => {
      expect(element.innerHTML).toBe(lastRenderedHtml);
      expect(element.textContent).toBe('B');
      expect(element.children.length).toBe(1);
      expect(rum.addError.calls.argsFor(0)[1]['insights.react.recovery']).toBe('last_rendered');
      expect(rum.addAction).toHaveBeenCalledWith(
        'insights_react_fallback_activated',
        jasmine.objectContaining({ 'insights.react.fallback': 'last_rendered' }),
      );
    }, done);
  });

  it('ignores later updates once the fallback is shown', (done) => {
    const store = createValueStore();
    act(() => {
      mountReact(element, ValueCard, { store });
    });
    act(() => {
      store.dispatch({ type: 'set', value: 'fail' });
    });

    afterRestore(() => {
      const fallbackHtml = element.innerHTML;
      expect(() => {
        act(() => {
          store.dispatch({ type: 'set', value: 'C' });
        });
      }).not.toThrow();
      expect(element.innerHTML).toBe(fallbackHtml);
    }, done);
  });
});
