import unittest.mock as mock
from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from django.http import HttpResponse
from django.test import RequestFactory, TestCase
from django.test.utils import override_settings

from analytics_dashboard.courses.tests.utils import CourseSamples
from analytics_dashboard.core.cache import get_source_aware_cache, set_source_aware_cache
from analytics_dashboard.courses.views import (
    AnalyticsV0Mixin,
    AnalyticsV1Mixin,
    CourseValidMixin,
    _record_insights_data_source,
    _set_insights_data_cache_header,
    _set_insights_data_source_header,
)


class CourseValidMixinTests(TestCase):
    def setUp(self):
        self.mixin = CourseValidMixin()
        self.mixin.course_id = CourseSamples.DEPRECATED_DEMO_COURSE_ID

    @override_settings(LMS_COURSE_VALIDATION_BASE_URL=None)
    def test_no_validation_url(self):
        self.assertTrue(self.mixin.is_valid_course())

    @override_settings(LMS_COURSE_VALIDATION_BASE_URL='a/url')
    @mock.patch('courses.views.requests.get')
    def test_valid_url(self, mock_lms_request):
        mock_lms_request.return_value.status_code = 404
        self.assertFalse(self.mixin.is_valid_course())

        mock_lms_request.return_value.status_code = 200
        self.assertTrue(self.mixin.is_valid_course())


class AnalyticsV0MixinTests(TestCase):
    def setUp(self):
        self.req = RequestFactory()
        self.mixin = AnalyticsV0Mixin()

    def test_default(self):
        r = self.req.get('whatever')
        self.mixin.setup(r)
        self.assertEqual(self.mixin.request, r)
        self.assertEqual(self.mixin.analytics_client.base_url, settings.DATA_API_URL)

    @mock.patch('analytics_dashboard.core.cache.flag_is_active', return_value=True)
    def test_cache_bypass_flag_is_evaluated_once_per_request(self, mock_flag_is_active):
        r = self.req.get('whatever')
        r.user = AnonymousUser()
        self.mixin.setup(r)

        get_source_aware_cache('missing-key', self.mixin.analytics_client)
        set_source_aware_cache('missing-key', {'value': 1}, self.mixin.analytics_client)

        mock_flag_is_active.assert_called_once_with(r, 'insights_dashboard_cache_bypass')

    def test_v0(self):
        r = self.req.get('whatever?v=0')
        self.mixin.setup(r)
        self.assertEqual(self.mixin.analytics_client.base_url, settings.DATA_API_URL)

    def test_v1(self):
        r = self.req.get('whatever?v=1')
        self.mixin.setup(r)
        self.assertEqual(self.mixin.analytics_client.base_url, settings.DATA_API_URL_V1)


class AnalyticsV1MixinTests(TestCase):
    def setUp(self):
        self.req = RequestFactory()
        self.mixin = AnalyticsV1Mixin()

    @override_settings(DATA_API_V1_ENABLED=False)
    def test_default_off(self):
        r = self.req.get('whatever')
        self.mixin.setup(r)
        self.assertEqual(self.mixin.request, r)
        self.assertEqual(self.mixin.analytics_client.base_url, settings.DATA_API_URL)

    @override_settings(DATA_API_V1_ENABLED=True)
    def test_default_on(self):
        r = self.req.get('whatever')
        self.mixin.setup(r)
        self.assertEqual(self.mixin.analytics_client.base_url, settings.DATA_API_URL_V1)

    @override_settings(DATA_API_V1_ENABLED=True)
    def test_v0(self):
        r = self.req.get('whatever?v=0')
        self.mixin.setup(r)
        self.assertEqual(self.mixin.analytics_client.base_url, settings.DATA_API_URL)

    @override_settings(DATA_API_V1_ENABLED=True)
    def test_v1(self):
        r = self.req.get('whatever?v=1')
        self.mixin.setup(r)
        self.assertEqual(self.mixin.analytics_client.base_url, settings.DATA_API_URL_V1)


class InsightsDataSourceHeaderTests(TestCase):
    def setUp(self):
        self.request = RequestFactory().get('whatever')

    def test_snowflake_source_is_forwarded(self):
        self.request.insights_data_sources = {'snowflake'}
        response = HttpResponse()

        _set_insights_data_source_header(self.request, response)

        self.assertEqual(response['X-Insights-Data-Source'], 'snowflake')

    def test_aurora_source_is_forwarded(self):
        self.request.insights_data_sources = {'aurora'}
        response = HttpResponse()

        _set_insights_data_source_header(self.request, response)

        self.assertEqual(response['X-Insights-Data-Source'], 'aurora')

    def test_mixed_sources_are_reported(self):
        self.request.insights_data_sources = {'aurora', 'snowflake'}
        response = HttpResponse()

        _set_insights_data_source_header(self.request, response)

        self.assertEqual(response['X-Insights-Data-Source'], 'mixed')

    def test_no_source_does_not_add_header(self):
        self.request.insights_data_sources = set()
        response = HttpResponse()

        _set_insights_data_source_header(self.request, response)

        self.assertNotIn('X-Insights-Data-Source', response)

    def test_cache_hit_is_forwarded(self):
        self.request.insights_cache_statuses = {'hit'}
        response = HttpResponse()

        _set_insights_data_cache_header(self.request, response)

        self.assertEqual(response['X-Insights-Data-Cache'], 'hit')

    def test_cache_miss_is_forwarded(self):
        self.request.insights_cache_statuses = {'miss'}
        response = HttpResponse()

        _set_insights_data_cache_header(self.request, response)

        self.assertEqual(response['X-Insights-Data-Cache'], 'miss')

    def test_mixed_cache_statuses_are_reported(self):
        self.request.insights_cache_statuses = {'hit', 'miss'}
        response = HttpResponse()

        _set_insights_data_cache_header(self.request, response)

        self.assertEqual(response['X-Insights-Data-Cache'], 'mixed')

    def test_no_cache_status_does_not_add_header(self):
        self.request.insights_cache_statuses = set()
        response = HttpResponse()

        _set_insights_data_cache_header(self.request, response)

        self.assertNotIn('X-Insights-Data-Cache', response)

    def test_source_response_records_cache_miss(self):
        self.request.insights_cache_bypass = False
        self.request.insights_cache_statuses = set()
        response = HttpResponse()
        response['X-Insights-Data-Source'] = 'snowflake'

        self.assertEqual(_record_insights_data_source(self.request, response), 'snowflake')
        self.assertEqual(self.request.insights_cache_statuses, {'miss'})

    def test_source_response_records_cache_bypass(self):
        self.request.insights_cache_bypass = True
        self.request.insights_cache_statuses = set()
        response = HttpResponse()
        response['X-Insights-Data-Source'] = 'aurora'

        self.assertEqual(_record_insights_data_source(self.request, response), 'aurora')
        self.assertEqual(self.request.insights_cache_statuses, {'bypass'})
