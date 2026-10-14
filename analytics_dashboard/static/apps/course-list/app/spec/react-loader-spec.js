import CourseModel from 'models/course-model';
import loadReactWidgets from 'course-list/app/react-loader';
import { resetMonitoringForTests } from 'components/react/monitoring';

describe('loadReactWidgets', () => {
  const SERVER_MARKUP = '<div class="col col-12 sm-col-12 md-col-3" data-stat-type="total_enrollment"'
    + ' data-react-widget="total-enrollment"><div class="summary-point text-center">'
    + '<div class="summary-point-wrapper"><div class="summary-point-number" title="1,234">1,234</div>'
    + '</div></div></div>';
  let originalRum;
  let rum;
  let page;

  const flagOn = () => new CourseModel({ enable_react_course_list: true });

  beforeEach(() => {
    resetMonitoringForTests();
    originalRum = window.DD_RUM;
    rum = {
      addError: jasmine.createSpy('addError'),
      addAction: jasmine.createSpy('addAction'),
    };
    window.DD_RUM = rum;
    // The monitoring adapter logs reported failures to the console in development builds.
    spyOn(console, 'error');
    setFixtures(`<div id="react-loader-page">${SERVER_MARKUP}</div>`);
    page = document.getElementById('react-loader-page');
  });

  afterEach(() => {
    window.DD_RUM = originalRum;
  });

  [
    ['absent', {}],
    ['off', { enable_react_course_list: false }],
  ].forEach(([description, attributes]) => {
    it(`does not load the React code when the flag is ${description}`, (done) => {
      const importWidgets = jasmine.createSpy('importWidgets');

      loadReactWidgets(new CourseModel(attributes), { importWidgets }).then((started) => {
        expect(started).toBe(false);
        expect(importWidgets).not.toHaveBeenCalled();
        expect(page.querySelector('[data-react-fallback]')).toBeNull();
        expect(rum.addError).not.toHaveBeenCalled();
        expect(rum.addAction).not.toHaveBeenCalled();
        done();
      }).catch(done.fail);
    });
  });

  it('starts the React widgets with the page model when the flag is on', (done) => {
    const courseModel = flagOn();
    const trackingModel = new CourseModel();
    const startReactWidgets = jasmine.createSpy('startReactWidgets');
    const importWidgets = () => Promise.resolve({ default: startReactWidgets });

    loadReactWidgets(courseModel, { trackingModel, importWidgets }).then((started) => {
      expect(started).toBe(true);
      expect(startReactWidgets).toHaveBeenCalledWith({ courseModel, trackingModel });
      expect(rum.addError).not.toHaveBeenCalled();
      expect(rum.addAction).not.toHaveBeenCalled();
      done();
    }).catch(done.fail);
  });

  [
    {
      failureType: 'chunk_load',
      description: 'the React code fails to load',
      importWidgets: () => Promise.reject(new Error('Loading chunk failed')),
    },
    {
      failureType: 'start_error',
      description: 'the React widgets fail to start',
      importWidgets: () => Promise.resolve({
        default: () => {
          throw new Error('start failed');
        },
      }),
    },
  ].forEach(({ failureType, description, importWidgets }) => {
    it(`keeps the server markup and reports once when ${description}`, (done) => {
      const widget = page.querySelector('[data-react-widget]');
      const serverMarkup = widget.innerHTML;

      loadReactWidgets(flagOn(), { importWidgets }).then((started) => {
        expect(started).toBe(false);
        expect(widget.innerHTML).toBe(serverMarkup);
        // Marked for the debug outline (?react_debug=1); invisible otherwise.
        expect(widget.getAttribute('data-react-fallback')).toBe('total-enrollment');

        expect(rum.addError).toHaveBeenCalledTimes(1);
        const context = rum.addError.calls.argsFor(0)[1];
        expect(context['insights.react.widget']).toBe('course-list');
        expect(context['insights.react.failure_type']).toBe(failureType);
        expect(context['insights.react.recovery']).toBe('server_html');

        expect(rum.addAction).toHaveBeenCalledTimes(1);
        expect(rum.addAction).toHaveBeenCalledWith(
          'insights_react_fallback_activated',
          jasmine.objectContaining({
            'insights.react.fallback': 'server_html',
            'insights.react.failure_type': failureType,
          }),
        );
        done();
      }).catch(done.fail);
    });
  });
});
