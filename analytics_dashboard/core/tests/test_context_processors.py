import json

from django.test import SimpleTestCase
from django.test.utils import override_settings

from analytics_dashboard.core.context_processors import common


class DatadogRumContextProcessorTests(SimpleTestCase):
    def get_datadog_rum_config(self):
        return common(None)['datadog_rum_config']

    def test_datadog_rum_disabled_by_default(self):
        config = self.get_datadog_rum_config()

        self.assertFalse(config['enabled'])

    @override_settings(
        DATADOG_RUM_ENABLED=True,
        DATADOG_RUM_APPLICATION_ID='test-application-id',
        DATADOG_RUM_CLIENT_TOKEN=None,
    )
    def test_datadog_rum_requires_credentials(self):
        config = self.get_datadog_rum_config()

        self.assertFalse(config['enabled'])

    @override_settings(
        DATADOG_RUM_ENABLED=True,
        DATADOG_RUM_APPLICATION_ID='test-application-id',
        DATADOG_RUM_CLIENT_TOKEN='test-client-token',
        DATADOG_RUM_ENV='stg',
        DATADOG_RUM_SESSION_SAMPLE_RATE='20',
        DATADOG_RUM_SESSION_REPLAY_SAMPLE_RATE='0',
    )
    def test_datadog_rum_enabled_with_required_config(self):
        config = self.get_datadog_rum_config()

        self.assertTrue(config['enabled'])
        self.assertEqual(config['applicationId'], 'test-application-id')
        self.assertEqual(config['clientToken'], 'test-client-token')
        self.assertEqual(config['env'], 'stg')
        self.assertEqual(config['service'], 'edx-insights-frontend')
        self.assertEqual(config['sessionSampleRate'], 20)
        self.assertEqual(config['sessionReplaySampleRate'], 0)

    @override_settings(
        DATADOG_RUM_ENABLED=True,
        DATADOG_RUM_APPLICATION_ID='test-application-id',
        DATADOG_RUM_CLIENT_TOKEN='test-client-token',
        DATADOG_RUM_SESSION_SAMPLE_RATE='invalid',
        DATADOG_RUM_SESSION_REPLAY_SAMPLE_RATE=None,
    )
    def test_datadog_rum_invalid_sample_rates_use_defaults(self):
        config = self.get_datadog_rum_config()

        self.assertEqual(config['sessionSampleRate'], 20)
        self.assertEqual(config['sessionReplaySampleRate'], 0)

    @override_settings(
        DATADOG_RUM_ENABLED='false',
        DATADOG_RUM_APPLICATION_ID='test-application-id',
        DATADOG_RUM_CLIENT_TOKEN='test-client-token',
    )
    def test_datadog_rum_string_false_is_disabled(self):
        config = self.get_datadog_rum_config()

        self.assertFalse(config['enabled'])

    @override_settings(
        DATADOG_RUM_ENABLED=True,
        DATADOG_RUM_APPLICATION_ID='test-application-id',
        DATADOG_RUM_CLIENT_TOKEN='test-client-token',
    )
    def test_datadog_rum_json_matches_config(self):
        context = common(None)

        self.assertEqual(json.loads(context['datadog_rum_config_json']), context['datadog_rum_config'])
