import contextlib
import json
from pathlib import Path

import unittest.mock as mock
from analyticsclient.exceptions import NotFoundError
from analyticsclient.exceptions import TimeoutError as AnalyticsTimeoutError
from ddt import data, ddt
from django.core.cache import cache
from django.test import TestCase
from waffle.testutils import override_flag, override_switch

import analytics_dashboard.courses.tests.utils as utils
from analytics_dashboard.courses.exceptions import PermissionsRetrievalFailedError
from analytics_dashboard.courses.tests.test_middleware import CoursePermissionsExceptionMixin
from analytics_dashboard.courses.tests.test_views import ViewTestMixin
from analytics_dashboard.courses.tests.utils import CourseSamples

PERMISSIONS_METHOD = 'analytics_dashboard.courses.views.course_summaries.permissions.get_user_course_permissions'
SUMMARIES_METHOD = \
    'analytics_dashboard.courses.presenters.course_summaries.CourseSummariesPresenter.get_course_summaries'
SUMMARY_METRICS_METHOD = \
    'analytics_dashboard.courses.presenters.course_summaries.CourseSummariesPresenter.get_course_summary_metrics'
PROGRAMS_METHOD = 'analytics_dashboard.courses.presenters.programs.ProgramsPresenter.get_programs'
SUMMARIES_API = 'analyticsclient.course_summaries.CourseSummaries.course_summaries'

# Expected text of the Total Enrollment card. The React card's JavaScript tests read the same file, so the
# server-rendered and React versions are held to the same expectations.
TOTAL_ENROLLMENT_CARD_FIXTURE = (
    Path(__file__).resolve().parents[3]
    / 'static' / 'apps' / 'course-list' / 'react' / 'spec' / 'fixtures' / 'total-enrollment-card.json'
)
TOTAL_ENROLLMENT_CARD = json.loads(TOTAL_ENROLLMENT_CARD_FIXTURE.read_text(encoding='utf-8'))


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

    @override_switch('enable_course_filters', active=True)
    @data(SUMMARIES_METHOD, PROGRAMS_METHOD)
    def test_get_with_analytics_api_timeout(self, timed_out_method):
        """ A timeout of the summaries or programs call shows the 503 page, not a 500, and is logged. """
        course_ids = [CourseSamples.DEMO_COURSE_ID]
        patches = {
            SUMMARIES_METHOD: mock.patch(SUMMARIES_METHOD, return_value=self.get_mock_data(course_ids)),
            PROGRAMS_METHOD: mock.patch(PROGRAMS_METHOD, return_value=self.get_programs_mock_data(course_ids)),
        }
        patches[timed_out_method] = mock.patch(timed_out_method, side_effect=AnalyticsTimeoutError('timed out'))
        with contextlib.ExitStack() as stack:
            stack.enter_context(mock.patch(PERMISSIONS_METHOD, return_value=course_ids))
            for patch in patches.values():
                stack.enter_context(patch)
            with self.assertLogs('analytics_dashboard.courses.views.course_summaries', level='WARNING') as logs:
                response = self.client.get(self.path())

        self.assertEqual(response.status_code, 503)
        self.assertTemplateUsed(response, '503.html')
        self.assertIn(f'for user {self.user.id} with 1 courses', logs.output[0])

    def test_get_without_summaries(self):
        """ A 404 from the API, when none of the courses has summaries, shows an empty course list, not a 500. """
        cache.clear()
        course_ids = [CourseSamples.DEMO_COURSE_ID]
        with mock.patch(PERMISSIONS_METHOD, return_value=course_ids):
            with mock.patch(SUMMARIES_API, side_effect=NotFoundError('not found')):
                response = self.client.get(self.path())

        self.assertEqual(response.status_code, 200)
        page_data = json.loads(response.context['page_data'])
        self.assertListEqual(page_data['course']['course_list_json'], [])

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
        for key in ('enable_react_course_list', 'summary', 'summary_text'):
            self.assertNotIn(key, course_data)
        self.assertContains(response, 'data-stat-type="total_enrollment">')
        self.assertNotContains(response, 'data-react-widget')

    @override_flag('enable_react_course_list', active=True)
    def test_react_flag_on(self):
        """ With the flag on, the page data carries the summary and the card is marked as the React mount point. """
        response = self.get_course_index()
        self.assertTrue(response.context['enable_react_course_list'])
        course_data = json.loads(response.context['page_data'])['course']
        self.assertIs(course_data['enable_react_course_list'], True)
        self.assertEqual(course_data['summary'], response.context['summary'])
        self.assertEqual(course_data['summary_text'], {
            'total_enrollment': {
                'label': TOTAL_ENROLLMENT_CARD['label'],
                'tooltip': TOTAL_ENROLLMENT_CARD['tooltip'],
            },
        })
        self.assertContains(response, 'data-stat-type="total_enrollment" data-react-widget="total-enrollment">')
        # The server-rendered card stays inside the mount point as the fallback.
        self.assertInHTML(
            f'<div class="summary-point-label">{TOTAL_ENROLLMENT_CARD["label"]}</div>',
            response.content.decode('utf-8'),
            count=1,
        )

    @data(*TOTAL_ENROLLMENT_CARD['cases'])
    def test_total_enrollment_card_flag_off(self, case):
        """ The server-rendered card matches the shared fixture (the React card's tests use the same fixture). """
        response = self.get_course_index(self.summary_with_total_enrollment(case['value']))
        self.assert_total_enrollment_card(response, case)

    @override_flag('enable_react_course_list', active=True)
    @data(*TOTAL_ENROLLMENT_CARD['cases'])
    def test_total_enrollment_card_flag_on(self, case):
        """ With the flag on, the fallback card is unchanged and the page data carries the same value. """
        response = self.get_course_index(self.summary_with_total_enrollment(case['value']))
        self.assert_total_enrollment_card(response, case)
        course_data = json.loads(response.context['page_data'])['course']
        self.assertEqual(course_data['summary']['total_enrollment'], case['value'])
