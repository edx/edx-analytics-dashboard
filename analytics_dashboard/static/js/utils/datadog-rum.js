define([], () => {
  'use strict';

  const REDACTED = '[REDACTED]';
  const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  const SENSITIVE_QUERY_PARAMS = [
    'account',
    'email',
    'learner',
    'name',
    'search',
    'text_search',
    'user',
    'user_id',
    'userTrackingID',
    'username',
  ];

  const replaceSensitiveQueryParam = (value, paramName) => {
    const pattern = new RegExp(`([?&]${paramName}=)[^&#]*`, 'gi');
    return value.replace(pattern, `$1${REDACTED}`);
  };

  const sanitizeString = (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    let sanitized = value
      .replace(EMAIL_PATTERN, REDACTED)
      .replace(/\/u\/[^/?&#]+/gi, `/u/${REDACTED}`)
      .replace(/\/accounts\/[^/?&#]+/gi, `/accounts/${REDACTED}`);

    SENSITIVE_QUERY_PARAMS.forEach((paramName) => {
      sanitized = replaceSensitiveQueryParam(sanitized, paramName);
    });

    return sanitized;
  };

  const sanitizeField = (object, fieldName) => {
    if (object && object[fieldName]) {
      object[fieldName] = sanitizeString(object[fieldName]); // eslint-disable-line no-param-reassign
    }
  };

  const beforeSend = (event) => {
    if (!event) {
      return true;
    }

    sanitizeField(event.view, 'url');
    sanitizeField(event.view, 'name');
    sanitizeField(event.view, 'referrer');
    sanitizeField(event.resource, 'url');
    sanitizeField(event.action && event.action.target, 'name');
    sanitizeField(event.error && event.error.resource, 'url');

    return true;
  };

  const modelValue = (model, key) => {
    if (!model || typeof model.get !== 'function') {
      return undefined;
    }
    return model.get(key);
  };

  const setIfPresent = (context, key, value) => {
    if (value !== undefined && value !== null && value !== '') {
      context[key] = value;
    }
  };

  const buildRumContext = (models) => {
    const context = {};
    const page = modelValue(models && models.trackingModel, 'page') || {};

    setIfPresent(context, 'insights.page_name', page.name);
    setIfPresent(context, 'insights.page_scope', page.scope);
    setIfPresent(context, 'insights.page_lens', page.lens);
    setIfPresent(context, 'insights.page_report', page.report);
    setIfPresent(context, 'insights.page_depth', page.depth);
    setIfPresent(context, 'insights.course_id', modelValue(models && models.courseModel, 'courseId'));
    setIfPresent(context, 'insights.org', modelValue(models && models.courseModel, 'org'));

    return context;
  };

  return {
    beforeSend,
    buildRumContext,
    sanitizeString,
  };
});
