define(['load/init-datadog-rum'], (DatadogRum) => {
  'use strict';

  describe('initDatadogRum', () => {
    const config = {
      enabled: true,
      applicationId: 'test-application-id',
      clientToken: 'test-client-token',
      site: 'datadoghq.com',
      service: 'edx-insights-frontend',
      env: 'stg',
      version: 'test-version',
      sessionSampleRate: 20,
      sessionReplaySampleRate: 0,
      defaultPrivacyLevel: 'mask',
      enablePrivacyForActionName: true,
    };
    let configElement;

    const removeConfigElement = () => {
      if (configElement && configElement.parentNode) {
        configElement.parentNode.removeChild(configElement);
      }
      configElement = null;
    };

    const addConfigElement = (value) => {
      removeConfigElement();
      configElement = document.createElement('script');
      configElement.id = 'datadog-rum-config';
      configElement.type = 'application/json';
      configElement.textContent = value;
      document.body.appendChild(configElement);
    };

    const createDatadogRum = () => ({
      init: jasmine.createSpy('init'),
      onReady: jasmine.createSpy('onReady').and.callFake(callback => callback()),
      setGlobalContextProperty: jasmine.createSpy('setGlobalContextProperty'),
    });

    beforeEach(() => {
      DatadogRum.resetForTests();
      removeConfigElement();
    });

    afterEach(() => {
      removeConfigElement();
    });

    it('returns null when the template config is missing', () => {
      expect(DatadogRum.readRumConfig()).toBe(null);
    });

    it('parses template config JSON', () => {
      addConfigElement(JSON.stringify(config));

      expect(DatadogRum.readRumConfig()).toEqual(config);
    });

    it('does not initialize when disabled', () => {
      const datadogRum = createDatadogRum();

      expect(DatadogRum.initDatadogRum({ ...config, enabled: false }, datadogRum)).toBe(false);
      expect(datadogRum.onReady).not.toHaveBeenCalled();
      expect(datadogRum.init).not.toHaveBeenCalled();
    });

    it('does not initialize when DD_RUM is missing', () => {
      expect(DatadogRum.initDatadogRum(config, null)).toBe(false);
    });

    it('initializes RUM once with safe options', () => {
      const datadogRum = createDatadogRum();

      expect(DatadogRum.initDatadogRum(config, datadogRum)).toBe(true);
      expect(DatadogRum.initDatadogRum(config, datadogRum)).toBe(false);
      expect(datadogRum.onReady.calls.count()).toBe(1);
      expect(datadogRum.init.calls.count()).toBe(1);

      const options = datadogRum.init.calls.argsFor(0)[0];
      expect(options.applicationId).toEqual(config.applicationId);
      expect(options.clientToken).toEqual(config.clientToken);
      expect(options.service).toEqual('edx-insights-frontend');
      expect(options.env).toEqual('stg');
      expect(options.sessionReplaySampleRate).toBe(0);
      expect(options.trackUserInteractions).toBe(true);
      expect(options.trackResources).toBe(true);
      expect(options.trackLongTasks).toBe(true);
      expect(options.beforeSend).toEqual(jasmine.any(Function));
      expect(options.allowedTracingUrls).toBeUndefined();
    });

    it('sets safe global context', () => {
      const datadogRum = createDatadogRum();
      const models = {
        courseModel: {
          get: key => ({
            courseId: 'course-v1:edX+DemoX+Demo_Course',
            org: 'edX',
          }[key]),
        },
        trackingModel: {
          get: key => ({
            page: {
              scope: 'course',
              lens: 'performance',
              report: 'graded_content',
              depth: '',
              name: 'course_performance_graded_content',
            },
          }[key]),
        },
      };

      DatadogRum.setContext(models, datadogRum);

      expect(datadogRum.setGlobalContextProperty).toHaveBeenCalledWith(
        'insights.page_name',
        'course_performance_graded_content',
      );
      expect(datadogRum.setGlobalContextProperty).toHaveBeenCalledWith(
        'insights.course_id',
        'course-v1:edX+DemoX+Demo_Course',
      );
    });
  });
});
