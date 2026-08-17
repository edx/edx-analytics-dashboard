import json

from django.conf import settings


def _as_bool(value):
    if isinstance(value, str):
        return value.strip().lower() in ('1', 'true', 'yes', 'on')
    return bool(value)


def _as_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _datadog_rum_config():
    enabled = (
        _as_bool(getattr(settings, 'DATADOG_RUM_ENABLED', False))
        and bool(getattr(settings, 'DATADOG_RUM_APPLICATION_ID', None))
        and bool(getattr(settings, 'DATADOG_RUM_CLIENT_TOKEN', None))
    )

    return {
        'enabled': enabled,
        'applicationId': getattr(settings, 'DATADOG_RUM_APPLICATION_ID', None),
        'clientToken': getattr(settings, 'DATADOG_RUM_CLIENT_TOKEN', None),
        'site': getattr(settings, 'DATADOG_RUM_SITE', 'datadoghq.com'),
        'service': getattr(settings, 'DATADOG_RUM_SERVICE', 'edx-insights-frontend'),
        'env': getattr(settings, 'DATADOG_RUM_ENV', None),
        'version': getattr(settings, 'DATADOG_RUM_VERSION', '1.0.0'),
        'scriptUrl': getattr(settings, 'DATADOG_RUM_SCRIPT_URL', None),
        'sessionSampleRate': _as_int(getattr(settings, 'DATADOG_RUM_SESSION_SAMPLE_RATE', 20), 20),
        'sessionReplaySampleRate': _as_int(getattr(settings, 'DATADOG_RUM_SESSION_REPLAY_SAMPLE_RATE', 0), 0),
        'defaultPrivacyLevel': getattr(settings, 'DATADOG_RUM_DEFAULT_PRIVACY_LEVEL', 'mask'),
        'enablePrivacyForActionName': _as_bool(
            getattr(settings, 'DATADOG_RUM_ENABLE_PRIVACY_FOR_ACTION_NAME', True)
        ),
    }


def common(_request):
    datadog_rum_config = _datadog_rum_config()

    return {
        'support_email': settings.SUPPORT_EMAIL,
        'full_application_name': settings.FULL_APPLICATION_NAME,
        'platform_name': settings.PLATFORM_NAME,
        'application_name': settings.APPLICATION_NAME,
        'footer_links': settings.FOOTER_LINKS,
        'datadog_rum_config': datadog_rum_config,
        'datadog_rum_config_json': json.dumps(datadog_rum_config),
    }
