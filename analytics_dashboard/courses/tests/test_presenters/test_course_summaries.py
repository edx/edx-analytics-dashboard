import unittest.mock as mock

from analyticsclient.client import Client
from analyticsclient.exceptions import TimeoutError as AnalyticsTimeoutError
from ddt import data, ddt, unpack
from django.conf import settings
from django.core.cache import cache
from django.test import TestCase, override_settings
from waffle.testutils import override_switch

from analytics_dashboard.core.cache import get_source_aware_cache
from analytics_dashboard.courses.presenters.course_summaries import CourseSummariesPresenter
from analytics_dashboard.courses.tests import utils
from analytics_dashboard.courses.tests.utils import CourseSamples

_ANOTHER_DEPRECATED_COURSE_ID = 'another/course/id'
SUMMARIES_API = 'analyticsclient.course_summaries.CourseSummaries.course_summaries'


@ddt
class CourseSummariesPresenterTests(TestCase):

    _API_SUMMARIES = {
        CourseSamples.DEPRECATED_DEMO_COURSE_ID: {
            'course_id': CourseSamples.DEPRECATED_DEMO_COURSE_ID,
            'catalog_course_title': 'Deprecated demo course',
            'catalog_course': 'edX+demo.1x',
            'start_date': '2016-03-07T050000',
            'end_date': '2016-04-18T080000',
            'pacing_type': 'instructor_paced',
            'availability': 'Archived',
            'count': 4,
            'cumulative_count': 4,
            'count_change_7_days': 4,
            'passing_users': 2,
            'enrollment_modes': {
                'audit': {
                    'count': 4,
                    'cumulative_count': 4,
                    'count_change_7_days': 4,
                    'passing_users': 2,
                },
                'credit': {
                    'count': 0,
                    'cumulative_count': 0,
                    'count_change_7_days': 0,
                    'passing_users': 0,
                },
                'verified': {
                    'count': 0,
                    'cumulative_count': 0,
                    'count_change_7_days': 0,
                    'passing_users': 0,
                },
                'professional': {
                    'count': 0,
                    'cumulative_count': 0,
                    'count_change_7_days': 0,
                    'passing_users': 0,
                },
                'honor': {
                    'count': 0,
                    'cumulative_count': 0,
                    'count_change_7_days': 0,
                    'passing_users': 0,
                }
            },
            'created': utils.CREATED_DATETIME_STRING,
        },
        CourseSamples.DEMO_COURSE_ID: {
            'course_id': CourseSamples.DEMO_COURSE_ID,
            'catalog_course_title': 'Demo Course',
            'catalog_course': None,
            'start_date': None,
            'end_date': None,
            'pacing_type': None,
            'availability': None,
            'count': 3884,
            'cumulative_count': 5106,
            'count_change_7_days': 0,
            'passing_users': 912,
            'enrollment_modes': {
                'audit': {
                    'count': 832,
                    'cumulative_count': 1007,
                    'count_change_7_days': 0,
                    'passing_users': 800,
                },
                'credit': {
                    'count': 0,
                    'cumulative_count': 0,
                    'count_change_7_days': 0,
                    'passing_users': 0,
                },
                'verified': {
                    'count': 12,
                    'cumulative_count': 12,
                    'count_change_7_days': 0,
                    'passing_users': 12,
                },
                'professional': {
                    'count': 0,
                    'cumulative_count': 0,
                    'count_change_7_days': 0,
                    'passing_users': 0,
                },
                'honor': {
                    'count': 3040,
                    'cumulative_count': 4087,
                    'count_change_7_days': 0,
                    'passing_users': 100,
                },
                'masters': {
                    'count': 1101,
                    'cumulative_count': 1103,
                    'count_change_7_days': 0,
                    'passing_users': 0,
                }
            },
            'created': utils.CREATED_DATETIME_STRING,
        },
        _ANOTHER_DEPRECATED_COURSE_ID: {
            'course_id': _ANOTHER_DEPRECATED_COURSE_ID,
            'catalog_course_title': None,
            'catalog_course': None,
            'start_date': None,
            'end_date': None,
            'pacing_type': 'instructor_paced',
            'availability': None,
            'count': 0,
            'cumulative_count': 1,
            'count_change_7_days': 0,
            'enrollment_modes': {
                'audit': {
                    'count': 1,
                    'cumulative_count': 1,
                    'count_change_7_days': 0,
                    'passing_users': 0,
                },
                'credit': {
                    'count': 0,
                    'cumulative_count': 0,
                    'count_change_7_days': 0,
                    'passing_users': 0,
                },
                'verified': {
                    'count': 1,
                    'cumulative_count': 1,
                    'count_change_7_days': 0,
                    'passing_users': 0,
                },
                'professional': {
                    'count': 0,
                    'cumulative_count': 0,
                    'count_change_7_days': 0,
                    'passing_users': 0,
                },
                'honor': {
                    'count': 1,
                    'cumulative_count': 1,
                    'count_change_7_days': 0,
                    'passing_users': 0,
                },
                'masters': {
                    'count': 10,
                    'cumulative_count': 10,
                    'count_change_7_days': 0,
                    'passing_users': 0,
                }
            },
            'created': utils.CREATED_DATETIME_STRING,
        },
    }

    _PRESENTER_SUMMARIES = {
        CourseSamples.DEPRECATED_DEMO_COURSE_ID:
            _API_SUMMARIES[CourseSamples.DEPRECATED_DEMO_COURSE_ID],
        CourseSamples.DEMO_COURSE_ID:
            _API_SUMMARIES[CourseSamples.DEMO_COURSE_ID],
        _ANOTHER_DEPRECATED_COURSE_ID:
            _API_SUMMARIES[_ANOTHER_DEPRECATED_COURSE_ID],
    }
    _PRESENTER_SUMMARIES[CourseSamples.DEMO_COURSE_ID].update({
        'catalog_course': '',
        'start_date': '',
        'end_date': '',
        'pacing_type': '',
        'availability': '',
    })
    _PRESENTER_SUMMARIES[_ANOTHER_DEPRECATED_COURSE_ID].update({
        'catalog_course': '',
        'catalog_course_title': '',
        'start_date': '',
        'end_date': '',
        'availability': '',
    })

    @data(
        (
            None,
            [
                CourseSamples.DEMO_COURSE_ID,
                CourseSamples.DEPRECATED_DEMO_COURSE_ID,
                _ANOTHER_DEPRECATED_COURSE_ID,
            ],
        ),
        (
            [
                CourseSamples.DEPRECATED_DEMO_COURSE_ID,
                CourseSamples.DEMO_COURSE_ID,
            ],
            [
                CourseSamples.DEMO_COURSE_ID,
                CourseSamples.DEPRECATED_DEMO_COURSE_ID,
            ],
        ),
        (
            [
                CourseSamples.DEMO_COURSE_ID,
            ] * (settings.COURSE_SUMMARIES_IDS_CUTOFF + 1),  # tests filter_summaries
            [
                CourseSamples.DEMO_COURSE_ID,
            ],
        ),
    )
    @unpack
    def test_get_summaries(self, input_course_ids, ouptut_course_ids):
        presenter = CourseSummariesPresenter(Client('base_url'))
        if input_course_ids:
            mock_api_response = [
                self._API_SUMMARIES[course_id] for course_id in input_course_ids
            ]
        else:
            mock_api_response = list(self._API_SUMMARIES.values())
        expected_summaries = [
            self._PRESENTER_SUMMARIES[course_id] for course_id in ouptut_course_ids
        ]

        with mock.patch('analyticsclient.course_summaries.CourseSummaries.course_summaries',
                        mock.Mock(return_value=mock_api_response)):
            actual_summaries, last_updated = presenter.get_course_summaries(course_ids=input_course_ids)
            for actual, expected in zip(actual_summaries, expected_summaries):
                self.assertCountEqual(actual, expected)
            self.assertEqual(last_updated, utils.CREATED_DATETIME)

    def test_no_summaries(self):
        cache.clear()  # previous test has course_ids=None case cached
        presenter = CourseSummariesPresenter(Client('base_url'))
        with mock.patch('analyticsclient.course_summaries.CourseSummaries.course_summaries',
                        mock.Mock(return_value=[])):
            summaries, last_updated = presenter.get_course_summaries()
            self.assertListEqual(summaries, [])
            self.assertIsNone(last_updated)

    def test_get_course_summary_metrics(self):
        presenter = CourseSummariesPresenter(Client('base_url'))
        metrics = presenter.get_course_summary_metrics(self._PRESENTER_SUMMARIES.values())
        expected = {
            'total_enrollment': 5111,
            'current_enrollment': 3888,
            'enrollment_change_7_days': 4,
            'verified_enrollment': 13,
            'masters_enrollment': 1111,
        }
        self.assertEqual(metrics, expected)

    def test_filter_summaries_without_course_ids(self):
        """ Without course IDs, every summary is kept. """
        summaries = list(self._API_SUMMARIES.values())
        self.assertListEqual(CourseSummariesPresenter.filter_summaries(summaries), summaries)

    def mock_summaries_api(self, client=None, timeouts=None):
        """ Returns a mock of the summaries API call that answers for the requested courses.

        If timeouts is a list, the client's timeout at the time of each call is appended to it.
        """
        def course_summaries(course_ids=None, **_kwargs):
            if timeouts is not None:
                timeouts.append(client.timeout)
            return [self._API_SUMMARIES[course_id] for course_id in course_ids or self._API_SUMMARIES]
        return mock.Mock(side_effect=course_summaries)

    def test_course_set_summaries_cached(self):
        """ The same course set, in any order and with duplicates, is fetched once and then read from the cache. """
        cache.clear()
        course_ids = [CourseSamples.DEMO_COURSE_ID, CourseSamples.DEPRECATED_DEMO_COURSE_ID]
        api = self.mock_summaries_api()
        with mock.patch(SUMMARIES_API, api):
            presenter = CourseSummariesPresenter(Client('base_url'))
            summaries, _last_updated = presenter.get_course_summaries(course_ids)
            for same_courses in (list(reversed(course_ids)), course_ids + course_ids):
                self.assertEqual(presenter.get_course_summaries(same_courses)[0], summaries)
        api.assert_called_once()

    def test_course_set_summaries_cached_separately(self):
        """ A different course set, API URL or set of excluded fields gets its own cache entry. """
        cache.clear()
        api = self.mock_summaries_api()
        with mock.patch(SUMMARIES_API, api):
            with override_switch('enable_course_passing', active=False):
                CourseSummariesPresenter(Client('base_url')).get_course_summaries([CourseSamples.DEMO_COURSE_ID])
                CourseSummariesPresenter(Client('base_url')).get_course_summaries(
                    [CourseSamples.DEPRECATED_DEMO_COURSE_ID]
                )
                CourseSummariesPresenter(Client('other_url')).get_course_summaries([CourseSamples.DEMO_COURSE_ID])
            with override_switch('enable_course_passing', active=True):
                CourseSummariesPresenter(Client('base_url')).get_course_summaries([CourseSamples.DEMO_COURSE_ID])
        self.assertEqual(api.call_count, 4)

    def test_empty_course_list_not_cached(self):
        """ An empty list of course IDs is fetched every time, as before. """
        cache.clear()
        api = mock.Mock(return_value=[])
        with mock.patch(SUMMARIES_API, api):
            presenter = CourseSummariesPresenter(Client('base_url'))
            presenter.get_course_summaries([])
            presenter.get_course_summaries([])
        self.assertEqual(api.call_count, 2)

    @override_settings(COURSE_SUMMARIES_API_TIMEOUT=30)
    def test_full_list_keeps_cache_key_and_timeout(self):
        """ The full list keeps its shared cache key and the client's own timeout. """
        cache.clear()
        client = Client('base_url', timeout=10)
        timeouts = []
        with mock.patch(SUMMARIES_API, self.mock_summaries_api(client, timeouts)):
            CourseSummariesPresenter(client).get_course_summaries()
        self.assertEqual(timeouts, [10])
        self.assertIsNotNone(get_source_aware_cache(CourseSummariesPresenter.CACHE_KEY, client))

    @override_settings(COURSE_SUMMARIES_API_TIMEOUT=30)
    def test_course_set_timeout(self):
        """ The summaries of a course set use COURSE_SUMMARIES_API_TIMEOUT, then the client's timeout is restored. """
        cache.clear()
        client = Client('base_url', timeout=10)
        timeouts = []
        with mock.patch(SUMMARIES_API, self.mock_summaries_api(client, timeouts)):
            CourseSummariesPresenter(client).get_course_summaries([CourseSamples.DEMO_COURSE_ID])
        self.assertEqual(timeouts, [30])
        self.assertEqual(client.timeout, 10)

    @override_settings(COURSE_SUMMARIES_API_TIMEOUT=None)
    def test_course_set_uses_client_timeout_without_setting(self):
        """ Without COURSE_SUMMARIES_API_TIMEOUT, the summaries of a course set use the client's own timeout. """
        cache.clear()
        client = Client('base_url', timeout=25)
        timeouts = []
        with mock.patch(SUMMARIES_API, self.mock_summaries_api(client, timeouts)):
            CourseSummariesPresenter(client).get_course_summaries([CourseSamples.DEMO_COURSE_ID])
        self.assertEqual(timeouts, [25])

    @override_settings(COURSE_SUMMARIES_API_TIMEOUT=30)
    def test_course_set_timeout_restored_after_error(self):
        """ The client's timeout is restored when the summaries call fails. """
        cache.clear()
        client = Client('base_url', timeout=10)
        with mock.patch(SUMMARIES_API, mock.Mock(side_effect=AnalyticsTimeoutError)):
            with self.assertRaises(AnalyticsTimeoutError):
                CourseSummariesPresenter(client).get_course_summaries([CourseSamples.DEMO_COURSE_ID])
        self.assertEqual(client.timeout, 10)
