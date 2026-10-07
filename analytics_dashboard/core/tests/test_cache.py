import unittest.mock as mock

from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.core.cache.backends.base import DEFAULT_TIMEOUT
from django.test import RequestFactory, TestCase

from analytics_dashboard.core.cache import (
    _cache_key,
    get_source_aware_cache,
    set_source_aware_cache,
)


class SourceAwareCacheTests(TestCase):
    def setUp(self):
        cache.clear()
        self.request = RequestFactory().get('/courses/')
        self.request.user = AnonymousUser()
        self.request.insights_data_sources = set()
        self.request.insights_cache_statuses = set()
        self.request.insights_cache_bypass = False
        self.client = mock.Mock(dashboard_request=self.request, last_data_source='snowflake')

    def test_cache_hit_records_source_and_status(self):
        set_source_aware_cache('test-key', {'value': 1}, self.client)
        self.request.insights_data_sources.clear()
        self.request.insights_cache_statuses.clear()

        self.assertEqual(get_source_aware_cache('test-key', self.client), {'value': 1})
        self.assertEqual(self.request.insights_data_sources, {'snowflake'})
        self.assertEqual(self.request.insights_cache_statuses, {'hit'})

    def test_legacy_entry_is_ignored(self):
        cache.set('legacy-key', {'value': 1})

        self.assertIsNone(get_source_aware_cache('legacy-key', self.client))
        self.assertEqual(cache.get('legacy-key'), {'value': 1})

    def test_bypass_skips_reads_and_writes(self):
        self.request.insights_cache_bypass = True
        cache.set(_cache_key('bypass-key'), {'source': 'snowflake', 'value': {'value': 'old'}})

        self.assertIsNone(get_source_aware_cache('bypass-key', self.client))
        set_source_aware_cache('bypass-key', {'value': 'new'}, self.client)

        self.assertEqual(
            cache.get(_cache_key('bypass-key')),
            {'source': 'snowflake', 'value': {'value': 'old'}},
        )
        self.assertEqual(self.request.insights_cache_statuses, {'bypass'})

    def test_unknown_source_is_cached_without_headers(self):
        self.client.last_data_source = 'unknown'
        set_source_aware_cache('unknown-key', {'value': 1}, self.client)
        self.request.insights_data_sources.clear()
        self.request.insights_cache_statuses.clear()
        self.client.last_data_source = 'snowflake'

        self.assertEqual(get_source_aware_cache('unknown-key', self.client), {'value': 1})
        self.assertEqual(self.request.insights_data_sources, set())
        self.assertEqual(self.request.insights_cache_statuses, set())
        self.assertIsNone(self.client.last_data_source)

    def test_malformed_entry_is_ignored(self):
        cache.set(_cache_key('malformed-key'), {'source': 'snowflake'})

        self.assertIsNone(get_source_aware_cache('malformed-key', self.client))

    def test_default_timeout_is_forwarded(self):
        with mock.patch('analytics_dashboard.core.cache.cache.set') as cache_set:
            set_source_aware_cache('default-timeout-key', {'value': 1}, self.client)

        self.assertEqual(cache_set.call_args.args[2], DEFAULT_TIMEOUT)
