import unittest.mock as mock

from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.test import RequestFactory, TestCase

from analytics_dashboard.core.cache import (
    INSIGHTS_CACHE_BYPASS_FLAG,
    get_source_aware_cache,
    set_source_aware_cache,
)


class SourceAwareCacheTests(TestCase):
    def setUp(self):
        self.request = RequestFactory().get('/courses/')
        self.request.user = AnonymousUser()
        self.request.insights_data_sources = set()
        self.request.insights_cache_statuses = set()
        self.client = mock.Mock(dashboard_request=self.request, last_data_source='snowflake')

    def test_cache_hit_records_source_and_status(self):
        set_source_aware_cache('test-key', {'value': 1}, self.client)
        self.request.insights_data_sources.clear()
        self.request.insights_cache_statuses.clear()

        self.assertEqual(get_source_aware_cache('test-key', self.client), {'value': 1})
        self.assertEqual(self.request.insights_data_sources, {'snowflake'})
        self.assertEqual(self.request.insights_cache_statuses, {'hit'})

    def test_legacy_entry_is_discarded(self):
        cache.set('legacy-key', {'value': 1})

        self.assertIsNone(get_source_aware_cache('legacy-key', self.client))
        self.assertIsNone(cache.get('legacy-key'))

    @mock.patch('analytics_dashboard.core.cache.flag_is_active', return_value=True)
    def test_bypass_skips_reads_and_writes(self, mock_flag_is_active):
        cache.set('bypass-key', {'value': 'old'})

        self.assertIsNone(get_source_aware_cache('bypass-key', self.client))
        set_source_aware_cache('bypass-key', {'value': 'new'}, self.client)

        self.assertEqual(cache.get('bypass-key'), {'value': 'old'})
        self.assertEqual(self.request.insights_cache_statuses, {'bypass'})
        mock_flag_is_active.assert_called_with(self.request, INSIGHTS_CACHE_BYPASS_FLAG)
