/**
 * Initializes Datadog RUM from dashboard template configuration.
 */
define(['utils/datadog-rum'], (DatadogRumUtils) => {
  'use strict';

  const CONFIG_ELEMENT_ID = 'datadog-rum-config';
  let initialized = false;

  const readRumConfig = () => {
    const configElement = document.getElementById(CONFIG_ELEMENT_ID);
    if (!configElement) {
      return null;
    }

    try {
      return JSON.parse(configElement.textContent || configElement.innerText);
    } catch (error) {
      return null;
    }
  };

  const hasRequiredConfig = config => (
    config && config.enabled && config.applicationId && config.clientToken
  );

  const initRum = (config, datadogRum) => {
    datadogRum.init({
      applicationId: config.applicationId,
      clientToken: config.clientToken,
      site: config.site,
      service: config.service,
      env: config.env,
      version: config.version,
      sessionSampleRate: config.sessionSampleRate,
      sessionReplaySampleRate: config.sessionReplaySampleRate,
      trackUserInteractions: true,
      trackResources: true,
      trackLongTasks: true,
      defaultPrivacyLevel: config.defaultPrivacyLevel,
      enablePrivacyForActionName: config.enablePrivacyForActionName,
      beforeSend: DatadogRumUtils.beforeSend,
    });
  };

  const initDatadogRum = (config = readRumConfig(), datadogRum = window.DD_RUM) => {
    if (initialized || !hasRequiredConfig(config) || !datadogRum || !datadogRum.init) {
      return false;
    }

    initialized = true;
    if (datadogRum.onReady) {
      datadogRum.onReady(() => initRum(config, datadogRum));
    } else {
      initRum(config, datadogRum);
    }

    return true;
  };

  const setContext = (models, datadogRum = window.DD_RUM) => {
    if (!datadogRum || !datadogRum.setGlobalContextProperty) {
      return;
    }

    const context = DatadogRumUtils.buildRumContext(models);
    Object.keys(context).forEach((key) => {
      datadogRum.setGlobalContextProperty(key, context[key]);
    });
  };

  return {
    initDatadogRum,
    readRumConfig,
    setContext,
    resetForTests: () => {
      initialized = false;
    },
  };
});
