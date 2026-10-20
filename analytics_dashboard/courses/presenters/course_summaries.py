from analyticsclient.constants import enrollment_modes
from django.conf import settings
from waffle import switch_is_active

from analytics_dashboard.core.cache import get_source_aware_cache, set_source_aware_cache
from analytics_dashboard.core.utils import sanitize_cache_key
from analytics_dashboard.courses.presenters import BasePresenter


class CourseSummariesPresenter(BasePresenter):
    """ Presenter for the course enrollment data. """

    CACHE_KEY = 'summaries'
    NON_NULL_STRING_FIELDS = ['course_id', 'catalog_course', 'catalog_course_title',
                              'start_date', 'end_date', 'pacing_type', 'availability']

    @staticmethod
    def filter_summaries(all_summaries, course_ids=None):
        """Filter results to just the course IDs specified."""
        if course_ids is None:
            return all_summaries
        return [summary for summary in all_summaries if summary['course_id'] in course_ids]

    def _get_cache_key(self, course_ids, exclude):
        """Returns the cache key for the requested summaries, or None if they should not be cached.

        The full list has one key. A set of course IDs gets a key built from the API URL (which includes the
        API version), the excluded fields and the course IDs.
        """
        if course_ids is None:
            return self.CACHE_KEY
        if not course_ids:
            return None
        key = '|'.join([self.client.base_url, ','.join(sorted(exclude)), ','.join(sorted(set(course_ids)))])
        return f'{self.CACHE_KEY}_{sanitize_cache_key(key)}'

    def _get_summaries(self, course_ids=None):
        """Returns list of course summaries.

        Summaries are read from the cache. If they are not cached, they are fetched from the analytics data API
        and cached.
        """
        exclude = ['programs']  # we make a separate call to the programs endpoint
        if not switch_is_active('enable_course_passing'):
            exclude.append('passing_users')
        cache_key = self._get_cache_key(course_ids, exclude)

        summaries = None
        if cache_key:
            summaries = get_source_aware_cache(cache_key, self.client)
        if summaries is None:
            timeout = self.client.timeout
            if course_ids and settings.COURSE_SUMMARIES_API_TIMEOUT:
                # The summaries of a user's courses can take longer than other calls, so they can have their own
                # timeout. Views create a client for each request, so this does not change other requests' timeout.
                self.client.timeout = settings.COURSE_SUMMARIES_API_TIMEOUT
            try:
                summaries = self.client.course_summaries().course_summaries(course_ids=course_ids, exclude=exclude)
            finally:
                self.client.timeout = timeout
            summaries = [
                {
                    field: (
                        '' if val is None and field in self.NON_NULL_STRING_FIELDS
                        else val
                    )
                    for field, val in summary.items()
                } for summary in summaries
            ]
            if cache_key:
                set_source_aware_cache(
                    cache_key,
                    summaries,
                    self.client,
                    settings.COURSE_SUMMARIES_CACHE_TIMEOUT,
                )
        return summaries

    def _get_last_updated(self, summaries):
        # all the create times should be the same, so just use the first one
        if summaries:
            summary = summaries[0]
            return self.parse_api_datetime(summary['created'])
        return None

    def get_course_summaries(self, course_ids=None):
        """
        Returns course summaries that match those listed in course_ids.  If
        no course IDs provided, all data will be returned.
        """
        if course_ids and len(course_ids) > settings.COURSE_SUMMARIES_IDS_CUTOFF:
            # Request all courses from the Analytics API and filter here
            all_summaries = self._get_summaries()
            summaries = self.filter_summaries(all_summaries, course_ids)
        else:
            # Request courses only in ID list from the Analytics API
            summaries = self._get_summaries(course_ids=course_ids)

        # sort by title by default with "None" values at the end
        summaries = sorted(
            summaries,
            key=lambda x: (not x['catalog_course_title'], x['catalog_course_title']))

        return summaries, self._get_last_updated(summaries)

    def get_course_summary_metrics(self, summaries):
        total = 0
        current = 0
        week_change = 0
        verified = 0
        masters = 0
        for s in summaries:
            total += s.get('cumulative_count', 0)
            current += s.get('count', 0)
            week_change += s.get('count_change_7_days', 0)
            modes = s.get('enrollment_modes', {})
            verified += modes.get(enrollment_modes.VERIFIED, {}).get('count', 0)
            masters += modes.get(enrollment_modes.MASTERS, {}).get('count', 0)

        summary = {
            'total_enrollment': total,
            'current_enrollment': current,
            'enrollment_change_7_days': week_change,
            'verified_enrollment': verified,
            'masters_enrollment': masters,
        }

        return summary
