import contextlib
import json
from pathlib import Path

import unittest.mock as mock
from analyticsclient.exceptions import InvalidRequestError, NotFoundError
from analyticsclient.exceptions import TimeoutError as AnalyticsTimeoutError
from ddt import data, ddt, unpack
from django.test import TestCase
from django.urls import reverse
from waffle.testutils import override_flag, override_switch

import analytics_dashboard.courses.tests.utils as utils
from analytics_dashboard.courses.exceptions import PermissionsRetrievalFailedError
from analytics_dashboard.courses.tests.test_middleware import CoursePermissionsExceptionMixin
from analytics_dashboard.courses.tests.test_views import ViewTestMixin
from analytics_dashboard.courses.tests.utils import CourseSamples
from analytics_dashboard.courses.views.course_summaries import get_date_range

PERMISSIONS_METHOD = 'analytics_dashboard.courses.views.course_summaries.permissions.get_user_course_permissions'
SUMMARIES_METHOD = \
    'analytics_dashboard.courses.presenters.course_summaries.CourseSummariesPresenter.get_course_summaries'
SUMMARY_METRICS_METHOD = \
    'analytics_dashboard.courses.presenters.course_summaries.CourseSummariesPresenter.get_course_summary_metrics'
PROGRAMS_METHOD = 'analytics_dashboard.courses.presenters.programs.ProgramsPresenter.get_programs'

# Expected text of the Total Enrollment card. The React card's JavaScript tests read the same file, so the
# server-rendered and React versions are held to the same expectations.
TOTAL_ENROLLMENT_CARD_FIXTURE = (
    Path(__file__).resolve().parents[3]
    / 'static' / 'apps' / 'course-list' / 'react' / 'spec' / 'fixtures' / 'total-enrollment-card.json'
)
TOTAL_ENROLLMENT_CARD = json.loads(TOTAL_ENROLLMENT_CARD_FIXTURE.read_text(encoding='utf-8'))

# Expected label and tooltip of every summary card of the React page (the page data's summary_text). The React
# page's JavaScript tests read the same file.
SUMMARY_TEXT = json.loads(
    TOTAL_ENROLLMENT_CARD_FIXTURE.with_name('summary-text.json').read_text(encoding='utf-8')
)


@ddt
class CourseSummariesViewTests(ViewTestMixin, CoursePermissionsExceptionMixin, TestCase):
    viewname = 'courses:index'

    def setUp(self):
        super().setUp()
        self.grant_permission(self.user, CourseSamples.DEMO_COURSE_ID, CourseSamples.DEPRECATED_DEMO_COURSE_ID)

    def get_mock_data(self, course_ids):
        return [{'course_id': course_id} for course_id in course_ids], utils.CREATED_DATETIME

    def get_programs_mock_data(self, course_ids):
        return [{'program_id': 'Demo_Program', 'course_ids': course_ids}]

    def assertCourseListEquals(self, courses):
        response = self.client.get(self.path())
        self.assertEqual(response.status_code, 200)
        self.assertListEqual(response.context['courses'], courses)

    def expected_summaries(self, course_ids):
        return self.get_mock_data(course_ids)[0]

    def expected_programs(self, course_ids):
        return self.get_programs_mock_data(course_ids)

    @override_switch('enable_course_filters', active=True)
    @data(
        [CourseSamples.DEMO_COURSE_ID],
        [CourseSamples.DEPRECATED_DEMO_COURSE_ID],
        [CourseSamples.DEMO_COURSE_ID, CourseSamples.DEPRECATED_DEMO_COURSE_ID]
    )
    def test_get(self, course_ids):
        """
        Test data is returned in the correct hierarchy.
        """
        permissions_method = \
            'analytics_dashboard.courses.views.course_summaries.permissions.get_user_course_permissions'
        presenter_method = \
            'analytics_dashboard.courses.presenters.course_summaries.CourseSummariesPresenter.get_course_summaries'
        programs_presenter_method = 'analytics_dashboard.courses.presenters.programs.ProgramsPresenter.get_programs'
        mock_data = self.get_mock_data(course_ids)
        programs_mock_data = self.get_programs_mock_data(course_ids)

        with mock.patch(permissions_method, return_value=course_ids):
            with mock.patch(presenter_method, return_value=mock_data) as summaries_presenter:
                with mock.patch(programs_presenter_method, return_value=programs_mock_data) as programs_presenter:
                    response = self.client.get(self.path())
                    self.assertEqual(response.status_code, 200)
                    context = response.context
                    page_data = json.loads(context['page_data'])
                    self.assertListEqual(page_data['course']['course_list_json'], self.expected_summaries(course_ids))
                    self.assertListEqual(page_data['course']['programs_json'], self.expected_programs(course_ids))
                    summaries_presenter.assert_called_with(course_ids)
                    programs_presenter.assert_called_with(course_ids=course_ids)

    def test_get_unauthorized(self):
        """ The view should raise an error if the user has no course permissions. """
        self.grant_permission(self.user)
        response = self.client.get(self.path())
        self.assertEqual(response.status_code, 403)

    @mock.patch('analytics_dashboard.courses.permissions.get_user_course_permissions',
                mock.Mock(side_effect=PermissionsRetrievalFailedError))
    def test_get_with_permissions_error(self):
        response = self.client.get(self.path())
        self.assertIsPermissionsRetrievalFailedResponse(response)

    def get_course_index(self, summary=None):
        """ Requests the course list page with the course data mocked, and optionally the summary metrics. """
        course_ids = [CourseSamples.DEMO_COURSE_ID]
        patches = [
            mock.patch(PERMISSIONS_METHOD, return_value=course_ids),
            mock.patch(SUMMARIES_METHOD, return_value=self.get_mock_data(course_ids)),
            mock.patch(PROGRAMS_METHOD, return_value=self.get_programs_mock_data(course_ids)),
        ]
        if summary is not None:
            patches.append(mock.patch(SUMMARY_METRICS_METHOD, return_value=summary))
        with contextlib.ExitStack() as stack:
            for patch in patches:
                stack.enter_context(patch)
            response = self.client.get(self.path())
        self.assertEqual(response.status_code, 200)
        return response

    @staticmethod
    def summary_with_total_enrollment(value):
        """ Returns summary metrics where only the Total Enrollment card can match the fixture's values. """
        return {
            'total_enrollment': value,
            'current_enrollment': 101,
            'enrollment_change_7_days': 202,
            'verified_enrollment': 303,
            'masters_enrollment': 404,
        }

    def assert_total_enrollment_card(self, response, case):
        """ Asserts the server-rendered Total Enrollment card shows the fixture's number, label and tooltip. """
        content = response.content.decode('utf-8')
        self.assertInHTML(
            f'<div class="summary-point-number" title="{case["title"]}">{case["display"]}</div>', content, count=1,
        )
        self.assertInHTML(f'<div class="summary-point-label">{TOTAL_ENROLLMENT_CARD["label"]}</div>', content, count=1)
        self.assertInHTML(f'<span class="sr-only">{TOTAL_ENROLLMENT_CARD["tooltip"]}</span>', content, count=1)

    def test_react_flag_off_by_default(self):
        """ With the enable_react_course_list flag off, the page and its page data are unchanged. """
        response = self.get_course_index()
        self.assertFalse(response.context['enable_react_course_list'])
        course_data = json.loads(response.context['page_data'])['course']
        for key in ('enable_react_course_list', 'summary', 'summary_text', 'course_list_rows_url'):
            self.assertNotIn(key, course_data)
        self.assertContains(response, 'data-stat-type="total_enrollment">')
        self.assertContains(response, 'course-list-app-container')
        self.assertNotContains(response, 'course-list-react-root')
        self.assertNotContains(response, 'paragon-styles')

    @override_flag('enable_react_course_list', active=True)
    def test_react_flag_on(self):
        """ With the flag on, the page has only the React mount point; none of the legacy UI is rendered. """
        response = self.get_course_index()
        self.assertTrue(response.context['enable_react_course_list'])
        course_data = json.loads(response.context['page_data'])['course']
        self.assertIs(course_data['enable_react_course_list'], True)
        self.assertEqual(course_data['course_list_rows_url'], reverse('courses:index_json'))
        self.assertEqual(course_data['summary'], response.context['summary'])
        self.assertEqual(course_data['summary_text'], SUMMARY_TEXT)
        # The legacy card and the React card have the same Total Enrollment label (the React tooltip differs: the
        # React cards count only the courses matching the filters).
        self.assertEqual(SUMMARY_TEXT['total_enrollment']['label'], TOTAL_ENROLLMENT_CARD['label'])
        # The React page's mount point holds the loading spinner.
        self.assertContains(response, 'id="course-list-react-root"')
        self.assertContains(response, 'loading-container')
        # Neither the legacy summary cards nor the Backbone course list container are rendered.
        self.assertNotContains(response, 'summary-point')
        self.assertNotContains(response, 'data-stat-type')
        self.assertNotContains(response, 'course-list-app-container')
        # Paragon's styles are linked, and the server-rendered "last updated" message is still there.
        self.assertContains(response, 'paragon-styles')
        self.assertContains(response, 'class="data-update-message"')

    @data(*TOTAL_ENROLLMENT_CARD['cases'])
    def test_total_enrollment_card_flag_off(self, case):
        """ The server-rendered card matches the shared fixture (the React card's tests use the same fixture). """
        response = self.get_course_index(self.summary_with_total_enrollment(case['value']))
        self.assert_total_enrollment_card(response, case)

    @override_flag('enable_react_course_list', active=True)
    @data(*TOTAL_ENROLLMENT_CARD['cases'])
    def test_total_enrollment_value_in_page_data_flag_on(self, case):
        """ With the flag on, the page data carries the Total Enrollment value for the React page. """
        response = self.get_course_index(self.summary_with_total_enrollment(case['value']))
        course_data = json.loads(response.context['page_data'])['course']
        self.assertEqual(course_data['summary']['total_enrollment'], case['value'])


@ddt
class GetDateRangeTests(TestCase):
    """ The Analytics API date range of the course list page's Timeframe. """

    @data(
        ({'timeframe': '7d'}, {'last_days': 7}),
        ({'timeframe': '30d'}, {'last_days': 30}),
        ({'timeframe': '60d', 'from': '2026-01-01', 'to': '2026-01-02'}, {'last_days': 60}),
        (
            {'timeframe': 'custom', 'from': '2026-10-21', 'to': '2026-10-24'},
            {'start_date': '2026-10-21', 'end_date': '2026-10-24'},
        ),
        (
            {'timeframe': 'custom', 'from': '2026-10-21', 'to': '2026-10-21'},
            {'start_date': '2026-10-21', 'end_date': '2026-10-21'},
        ),
    )
    @unpack
    def test_a_timeframe_gives_its_range(self, params, expected):
        self.assertEqual(get_date_range(params), expected)

    @data(
        {},
        {'timeframe': 'all'},
        {'timeframe': '90d'},
        {'timeframe': 'custom'},
        {'timeframe': 'custom', 'from': '2026-10-21'},
        {'timeframe': 'custom', 'to': '2026-10-21'},
        {'timeframe': 'custom', 'from': '2026-10-24', 'to': '2026-10-21'},
        {'timeframe': 'custom', 'from': '2026-02-30', 'to': '2026-03-01'},
        {'timeframe': 'custom', 'from': '21/10/2026', 'to': '2026-10-24'},
    )
    def test_anything_else_is_all_time(self, params):
        self.assertIsNone(get_date_range(params))


@ddt
class CourseIndexJSONTests(ViewTestMixin, TestCase):
    """ The course rows that the React course list asks for when its Timeframe changes. """
    viewname = 'courses:index_json'

    COURSE_IDS = [CourseSamples.DEMO_COURSE_ID, CourseSamples.DEPRECATED_DEMO_COURSE_ID]
    ROWS = [{'course_id': CourseSamples.DEMO_COURSE_ID, 'count': 4, 'cumulative_count': 2}]

    def get_mock_data(self, course_ids):
        return [row for row in self.ROWS if row['course_id'] in course_ids], utils.CREATED_DATETIME

    def get_json(self, params=None, **presenter_kwargs):
        """ Requests the rows with the user's courses and the presenter mocked; returns the response and the mock. """
        presenter_kwargs.setdefault('return_value', self.get_mock_data(self.COURSE_IDS))
        with mock.patch(PERMISSIONS_METHOD, return_value=self.COURSE_IDS):
            with mock.patch(SUMMARIES_METHOD, **presenter_kwargs) as summaries_presenter:
                response = self.client.get(self.path(), params or {})
        return response, summaries_presenter

    def test_flag_off_is_a_404(self):
        response, summaries_presenter = self.get_json({'timeframe': '30d'})

        self.assertEqual(response.status_code, 404)
        summaries_presenter.assert_not_called()

    @override_flag('enable_react_course_list', active=True)
    @override_switch('enable_course_filters', active=True)
    @data(
        ({'timeframe': '30d'}, {'last_days': 30}),
        ({'timeframe': 'custom', 'from': '2026-10-21', 'to': '2026-10-24'},
         {'start_date': '2026-10-21', 'end_date': '2026-10-24'}),
        ({}, None),
        ({'timeframe': 'custom', 'from': '2026-10-21'}, None),
    )
    @unpack
    def test_rows_of_the_timeframe(self, params, date_range):
        response, summaries_presenter = self.get_json(params)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/json')
        self.assertEqual(response.json(), {'course_list_json': self.ROWS})
        summaries_presenter.assert_called_once_with(self.COURSE_IDS, date_range=date_range)

    @override_flag('enable_react_course_list', active=True)
    def test_without_the_filters_switch_the_rows_are_all_time(self):
        """ The page shows the Timeframe only with the filters switch on. """
        response, summaries_presenter = self.get_json({'timeframe': '30d'})

        self.assertEqual(response.status_code, 200)
        summaries_presenter.assert_called_once_with(self.COURSE_IDS, date_range=None)

    @override_flag('enable_react_course_list', active=True)
    @override_switch('enable_course_filters', active=True)
    def test_no_summaries_is_an_empty_list(self):
        response, _ = self.get_json({'timeframe': '7d'}, side_effect=NotFoundError)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'course_list_json': []})

    @override_flag('enable_react_course_list', active=True)
    @override_switch('enable_course_filters', active=True)
    @data((InvalidRequestError, 400), (AnalyticsTimeoutError, 503))
    @unpack
    def test_api_errors(self, error, status):
        response, _ = self.get_json({'timeframe': '7d'}, side_effect=error)

        self.assertEqual(response.status_code, status)
        self.assertIn('error', response.json())

    @override_flag('enable_react_course_list', active=True)
    def test_a_user_without_courses_is_refused(self):
        with mock.patch(PERMISSIONS_METHOD, return_value=[]):
            with mock.patch(SUMMARIES_METHOD) as summaries_presenter:
                response = self.client.get(self.path())

        self.assertEqual(response.status_code, 403)
        summaries_presenter.assert_not_called()

    @override_flag('enable_react_course_list', active=True)
    def test_a_user_who_is_not_logged_in_is_refused(self):
        self.client.logout()
        response, summaries_presenter = self.get_json({'timeframe': '7d'})

        self.assertEqual(response.status_code, 403)
        summaries_presenter.assert_not_called()
