"""Helpers for caching Analytics API data with source provenance."""

from django.core.cache import cache
from django.core.cache.backends.base import DEFAULT_TIMEOUT
from waffle import flag_is_active


INSIGHTS_CACHE_BYPASS_FLAG = 'insights_dashboard_cache_bypass'
INSIGHTS_CACHE_ENVELOPE_VERSION = 1
INSIGHTS_CACHE_KEY_PREFIX = f'insights_source_v{INSIGHTS_CACHE_ENVELOPE_VERSION}:'
INSIGHTS_DATA_SOURCES = frozenset(('aurora', 'snowflake'))


def _cache_key(key):
    """Return the versioned key used for source-aware cache entries."""
    return f'{INSIGHTS_CACHE_KEY_PREFIX}{key}'


def is_cache_bypass_enabled(request):
    """Return whether the current Dashboard request should skip the cache."""
    if request is None or not hasattr(request, 'user'):
        return False
    return bool(flag_is_active(request, INSIGHTS_CACHE_BYPASS_FLAG))


def _is_cache_bypass_enabled(client):
    """Return the cache decision captured during request setup."""
    request = getattr(client, 'dashboard_request', None)
    return bool(getattr(request, 'insights_cache_bypass', False))


def _record_cache_event(client, status, source=None):
    """Record cache and source information on the current Dashboard request."""
    request = getattr(client, 'dashboard_request', None)
    if request is None:
        return

    cache_statuses = getattr(request, 'insights_cache_statuses', None)
    if cache_statuses is not None:
        cache_statuses.add(status)
    if source in INSIGHTS_DATA_SOURCES:
        data_sources = getattr(request, 'insights_data_sources', None)
        if data_sources is not None:
            data_sources.add(source)
        client.last_data_source = source


def get_source_aware_cache(key, client):
    """Get cached Analytics data and record its source when available.

    Entries written before source-aware caching was introduced use a different
    key namespace and expire naturally without being read by this helper.
    """
    if _is_cache_bypass_enabled(client):
        _record_cache_event(client, 'bypass')
        return None

    entry = cache.get(_cache_key(key))
    if not isinstance(entry, dict) or 'value' not in entry:
        return None

    source = entry.get('source')
    if source in INSIGHTS_DATA_SOURCES:
        _record_cache_event(client, 'hit', source)
    else:
        # Unknown provenance remains cacheable, but must not inherit a source
        # from an earlier request made by the same client instance.
        client.last_data_source = None

    return entry['value']


def set_source_aware_cache(key, value, client, timeout=DEFAULT_TIMEOUT):
    """Cache Analytics data and persist the source used to retrieve it."""
    if _is_cache_bypass_enabled(client):
        return value

    source = getattr(client, 'last_data_source', None)
    cache.set(
        _cache_key(key),
        {
            'source': source if source in INSIGHTS_DATA_SOURCES else None,
            'value': value,
        },
        timeout,
    )

    return value
