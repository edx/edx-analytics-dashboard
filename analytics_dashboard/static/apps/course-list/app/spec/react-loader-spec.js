import CourseModel from 'models/course-model';
import loadReactPage, { showLoadError } from 'course-list/app/react-loader';
import { resetMonitoringForTests } from 'components/react/monitoring';

describe('loadReactPage', () => {
  let originalRum;
  let rum;
  let root;

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
    setFixtures('<div id="course-list-react-root"><div class="loading-container">Loading</div></div>');
    root = document.getElementById('course-list-react-root');
  });

  afterEach(() => {
    window.DD_RUM = originalRum;
  });

  [
    ['absent', {}],
    ['off', { enable_react_course_list: false }],
  ].forEach(([description, attributes]) => {
    it(`does not load the React code when the flag is ${description}`, (done) => {
      const importPage = jasmine.createSpy('importPage');

      loadReactPage(new CourseModel(attributes), importPage).then((started) => {
        expect(started).toBe(false);
        expect(importPage).not.toHaveBeenCalled();
        expect(root.querySelector('.loading-container')).not.toBeNull();
        expect(rum.addError).not.toHaveBeenCalled();
        done();
      }).catch(done.fail);
    });
  });

  it('starts the React page with the page model when the flag is on', (done) => {
    const courseModel = flagOn();
    const startReactPage = jasmine.createSpy('startReactPage');

    loadReactPage(courseModel, () => Promise.resolve({ default: startReactPage })).then((started) => {
      expect(started).toBe(true);
      expect(startReactPage).toHaveBeenCalledWith({ courseModel });
      expect(rum.addError).not.toHaveBeenCalled();
      done();
    }).catch(done.fail);
  });

  [
    {
      failureType: 'chunk_load',
      description: 'the React code fails to load',
      importPage: () => Promise.reject(new Error('Loading chunk failed')),
    },
    {
      failureType: 'start_error',
      description: 'the React page fails to start',
      importPage: () => Promise.resolve({
        default: () => {
          throw new Error('start failed');
        },
      }),
    },
  ].forEach(({ failureType, description, importPage }) => {
    it(`shows the error alert in place of the spinner and reports once when ${description}`, (done) => {
      loadReactPage(flagOn(), importPage).then((started) => {
        expect(started).toBe(false);
        expect(root.querySelector('.loading-container')).toBeNull();
        expect(root.querySelector('.alert.alert-error[role="alert"]')).not.toBeNull();
        expect(root.querySelector('.alert-title').textContent).toBe('We are unable to load this page.');
        expect(root.querySelector('.alert-copy-with-title').textContent).toBe('Reload the page to try again.');

        expect(rum.addError).toHaveBeenCalledTimes(1);
        const context = rum.addError.calls.argsFor(0)[1];
        expect(context['insights.react.widget']).toBe('course-list');
        expect(context['insights.react.failure_type']).toBe(failureType);
        expect(context['insights.react.recovery']).toBe('error_state');
        expect(rum.addAction).not.toHaveBeenCalled();
        done();
      }).catch(done.fail);
    });
  });

  describe('showLoadError', () => {
    it('replaces the spinner with the error alert and reports the failure once', () => {
      const result = showLoadError('start_error', new Error('init failed'));

      expect(result).toBe(false);
      expect(root.querySelector('.loading-container')).toBeNull();
      expect(root.querySelector('.alert-error .alert-title').textContent).toBe('We are unable to load this page.');
      expect(rum.addError).toHaveBeenCalledTimes(1);
      const context = rum.addError.calls.argsFor(0)[1];
      expect(context['insights.react.failure_type']).toBe('start_error');
      expect(context['insights.react.recovery']).toBe('error_state');
    });

    it('still reports the failure when the page has no mount point', () => {
      setFixtures('<div id="somewhere-else"></div>');

      expect(showLoadError('start_error', new Error('init failed'))).toBe(false);
      expect(rum.addError).toHaveBeenCalledTimes(1);
    });
  });
});
