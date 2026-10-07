"""Helpers for caching Analytics API data with source provenance."""

from django.core.cache import cache
from waffle import flag_is_active


INSIGHTS_CACHE_BYPASS_FLAG = 'insights_dashboard_cache_bypass'
INSIGHTS_CACHE_METADATA_VERSION = 1
INSIGHTS_CACHE_METADATA_SUFFIX = ':insights_cache_metadata'
INSIGHTS_DATA_SOURCES = frozenset(('aurora', 'snowflake'))


def _metadata_key(key):
    """Return the companion key used for cache provenance metadata."""
    return f'{key}{INSIGHTS_CACHE_METADATA_SUFFIX}'


def is_cache_bypass_enabled(request):
    """Return whether the current Dashboard request must skip the cache."""
    if request is None or not hasattr(request, 'user'):
        return False
    return bool(flag_is_active(request, INSIGHTS_CACHE_BYPASS_FLAG))


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

    Entries written before source metadata was introduced are discarded and
    refreshed. This prevents a legacy cache value from producing an unlabeled
    Dashboard response.
    """
    request = getattr(client, 'dashboard_request', None)
    if is_cache_bypass_enabled(request):
        _record_cache_event(client, 'bypass')
        return None

    value = cache.get(key)
    if value is None:
        return None

    metadata = cache.get(_metadata_key(key))
    if (
        not isinstance(metadata, dict) or
        metadata.get('version') != INSIGHTS_CACHE_METADATA_VERSION or
        metadata.get('source') not in INSIGHTS_DATA_SOURCES
    ):
        # Do not use an entry whose source cannot be reported accurately.
        cache.delete_many((key, _metadata_key(key)))
        return None

    _record_cache_event(client, 'hit', metadata['source'])
    return value


def set_source_aware_cache(key, value, client, timeout=None):
    """Cache Analytics data and persist the source used to retrieve it."""
    request = getattr(client, 'dashboard_request', None)
    if is_cache_bypass_enabled(request):
        return value

    cache.set(key, value, timeout)
    source = getattr(client, 'last_data_source', None)
    metadata_key = _metadata_key(key)

    if source in INSIGHTS_DATA_SOURCES:
        cache.set(
            metadata_key,
            {
                'version': INSIGHTS_CACHE_METADATA_VERSION,
                'source': source,
            },
            timeout,
        )
    else:
        # A response without a recognized source must not become a reusable
        # source-aware entry.
        cache.delete(metadata_key)

    return value
