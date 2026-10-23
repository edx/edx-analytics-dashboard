from analyticsclient.constants import enrollment_modes
from django.conf import settings
from waffle import switch_is_active

from analytics_dashboard.core.cache import get_source_aware_cache, set_source_aware_cache
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

    @staticmethod
    def _has_learners(summary, segment):
        """ Whether the summary has learners in a segment (a value of the Sales Model or Funding Model filter). """
        try:
            return float(summary.get(f'{segment}_count')) > 0
        except (TypeError, ValueError):
            return False

    @classmethod
    def filter_by_query(cls, summaries, search='', filters=None, programs=None):
        """
        Returns the summaries that match the search and the filters of the course list page, in their order.

        The rules are the page's (static/apps/course-list/react/state/selectors.js and registries/filters.js), and the
        shared fixture spec/fixtures/course-list-filter-cases.json holds cases that both implementations must pass:
        - search: a summary matches when any word of the text is part of its title or course ID, ignoring case;
        - filters: {filter id: [selected values]}. The values of one filter are alternatives, the filters and the
          search narrow each other. A filter without values is not applied. The ids are availability (a missing one
          is 'unknown'), pacing_type, program_ids (the programs the course belongs to, from `programs`), courses (the
          catalog course, or the course ID when it has none), and sales and funding, which match a summary that has
          learners in a selected segment (the value b2b reads b2b_count, and so on).
        """
        words = (search or '').lower().split()
        selected = {key: values for key, values in (filters or {}).items() if values}
        programs = programs or []

        def program_ids_of(summary):
            return [program['program_id'] for program in programs if summary['course_id'] in program['course_ids']]

        # Each check says whether a summary matches the selected values of one filter.
        checks = {
            'availability': lambda summary, values: (summary.get('availability') or 'unknown') in values,
            'pacing_type': lambda summary, values: summary.get('pacing_type') in values,
            'program_ids': lambda summary, values: any(program_id in values for program_id in program_ids_of(summary)),
            'courses': lambda summary, values: (summary.get('catalog_course') or summary['course_id']) in values,
            'sales': lambda summary, values: any(cls._has_learners(summary, value) for value in values),
            'funding': lambda summary, values: any(cls._has_learners(summary, value) for value in values),
        }

        def matches_filters(summary):
            return all(checks[key](summary, values) for key, values in selected.items() if key in checks)

        def matches_search(summary):
            text = f"{summary.get('catalog_course_title') or ''} {summary['course_id']}".lower()
            return not words or any(word in text for word in words)

        return [summary for summary in summaries if matches_search(summary) and matches_filters(summary)]

    def _get_summaries(self, course_ids=None):
        """Returns list of course summaries.

        If requesting full list and it's not cached or requesting a subset of course_summaries with the course_ids
        parameter, summaries will be fetched from the analytics data API.
        """
        summaries = None
        if course_ids is None:
            # we only cache the full list of summaries
            summaries = get_source_aware_cache(self.CACHE_KEY, self.client)
        if summaries is None:
            exclude = ['programs']  # we make a separate call to the programs endpoint
            if not switch_is_active('enable_course_passing'):
                exclude.append('passing_users')
            summaries = self.client.course_summaries().course_summaries(course_ids=course_ids, exclude=exclude)
            summaries = [
                {
                    field: (
                        '' if val is None and field in self.NON_NULL_STRING_FIELDS
                        else val
                    )
                    for field, val in summary.items()
                } for summary in summaries
            ]
            if course_ids is None:
                set_source_aware_cache(
                    self.CACHE_KEY,
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
