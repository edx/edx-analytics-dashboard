import {
  reportFallbackActivated,
  reportWidgetFailure,
  resetMonitoringForTests,
} from 'components/react/monitoring';

describe('React widget monitoring', () => {
  const FAILURE_CONTEXT_KEYS = [
    'insights.react.error_name',
    'insights.react.failure_type',
    'insights.react.flag',
    'insights.react.flag_enabled',
    'insights.react.recovery',
    'insights.react.widget',
  ];
  let originalRum;
  let rum;
  let consoleError;

  beforeEach(() => {
    resetMonitoringForTests();
    originalRum = window.DD_RUM;
    rum = {
      addError: jasmine.createSpy('addError'),
      addAction: jasmine.createSpy('addAction'),
    };
    window.DD_RUM = rum;
    consoleError = spyOn(console, 'error');
  });

  afterEach(() => {
    window.DD_RUM = originalRum;
  });

  it('does nothing when RUM is not loaded', () => {
    window.DD_RUM = undefined;

    expect(() => {
      reportWidgetFailure({ widget: 'total-enrollment', failureType: 'render_error', recovery: 'server_html' });
      reportFallbackActivated({ widget: 'total-enrollment', fallback: 'server_html', failureType: 'render_error' });
    }).not.toThrow();
  });

  it('sends a fixed message and only the allow-listed context', () => {
    reportWidgetFailure({
      widget: 'total-enrollment',
      failureType: 'render_error',
      recovery: 'last_rendered',
      error: new TypeError('secret 3378149'),
    });

    expect(rum.addError).toHaveBeenCalledTimes(1);
    const [error, context] = rum.addError.calls.argsFor(0);
    expect(error instanceof Error).toBe(true);
    expect(error.message).toBe('Insights React widget failed to render');
    expect(Object.keys(context).sort()).toEqual(FAILURE_CONTEXT_KEYS);
    expect(context).toEqual({
      'insights.react.widget': 'total-enrollment',
      'insights.react.flag': 'enable_react_course_list',
      'insights.react.flag_enabled': true,
      'insights.react.failure_type': 'render_error',
      'insights.react.recovery': 'last_rendered',
      'insights.react.error_name': 'TypeError',
    });
    expect(JSON.stringify(context)).not.toContain('secret');
    expect(JSON.stringify(context)).not.toContain('3378149');
  });

  it('adds the React version when it is known', () => {
    reportWidgetFailure({
      widget: 'total-enrollment', failureType: 'render_error', recovery: 'server_html', libraryVersion: '18.3.1',
    });

    const context = rum.addError.calls.argsFor(0)[1];
    expect(context['insights.react.library_version']).toBe('18.3.1');
  });

  it('uses a fixed message for every failure type', () => {
    const messages = {
      chunk_load: 'Insights React widgets failed to load',
      start_error: 'Insights React widgets failed to start',
      render_error: 'Insights React widget failed to render',
      invalid_update: 'Insights React widget received invalid data',
    };
    Object.keys(messages).forEach((failureType) => {
      reportWidgetFailure({ widget: 'course-list', failureType, recovery: 'server_html' });
    });

    expect(rum.addError.calls.allArgs().map(args => args[0].message)).toEqual(
      Object.keys(messages).map(failureType => messages[failureType]),
    );
  });

  it('reports each widget and failure type at most once per page load', () => {
    const failure = { widget: 'summary', failureType: 'invalid_update', recovery: 'kept_last_value' };
    reportWidgetFailure(failure);
    reportWidgetFailure(failure);
    reportWidgetFailure({ ...failure, failureType: 'render_error', recovery: 'server_html' });

    expect(rum.addError).toHaveBeenCalledTimes(2);
  });

  it('reports a fallback activation once per widget, as an action', () => {
    reportFallbackActivated({ widget: 'course-list', fallback: 'server_html', failureType: 'chunk_load' });
    reportFallbackActivated({ widget: 'course-list', fallback: 'server_html', failureType: 'start_error' });

    expect(rum.addAction).toHaveBeenCalledTimes(1);
    expect(rum.addAction).toHaveBeenCalledWith('insights_react_fallback_activated', {
      'insights.react.widget': 'course-list',
      'insights.react.flag': 'enable_react_course_list',
      'insights.react.flag_enabled': true,
      'insights.react.fallback': 'server_html',
      'insights.react.failure_type': 'chunk_load',
    });
  });

  it('never lets a RUM error reach the page', () => {
    rum.addError.and.throwError('RUM failed');
    rum.addAction.and.throwError('RUM failed');

    expect(() => {
      reportWidgetFailure({ widget: 'total-enrollment', failureType: 'render_error', recovery: 'server_html' });
      reportFallbackActivated({ widget: 'total-enrollment', fallback: 'server_html', failureType: 'render_error' });
    }).not.toThrow();
  });

  it('logs to the console in development builds', () => {
    const error = new Error('boom');
    reportWidgetFailure({
      widget: 'summary', failureType: 'invalid_update', recovery: 'kept_last_value', error,
    });

    expect(consoleError).toHaveBeenCalledWith('Insights React widget received invalid data', error);
  });
});
