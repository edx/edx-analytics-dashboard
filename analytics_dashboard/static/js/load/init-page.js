/**
 * Initializes page with the model and various UI elements that need JS hooks.
 */
const initTracking = require('load/init-tracking');

define([
  'jquery', 'load/init-models', 'load/init-datadog-rum', 'load/init-tooltips',
], ($, models, DatadogRum) => {
  'use strict';

  // initialize tracking
  initTracking(models);

  DatadogRum.setContext(models);
  models.trackingModel.on('change:page', () => {
    DatadogRum.setContext(models);
  });

  return {
    models,
  };
});
