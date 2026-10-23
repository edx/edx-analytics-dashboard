import csv
import io
import json
import unittest.mock as mock
import urllib
from pathlib import Path

from analyticsclient.exceptions import NotFoundError
from ddt import data, ddt
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from waffle.testutils import override_switch

from analytics_dashboard.courses.tests.test_views import ViewTestMixin
from analytics_dashboard.courses.tests.utils import (
    CourseSamples,
    ProgramSamples,
    convert_list_of_dicts_to_csv,
    get_mock_api_course_activity,
    get_mock_api_enrollment_age_data,
    get_mock_api_enrollment_data,
    get_mock_api_enrollment_education_data,
    get_mock_api_enrollment_gender_data,
    get_mock_api_enrollment_geography_data,
    get_mock_course_summaries,
    get_mock_course_summaries_csv,
    get_mock_programs,
)
from analytics_dashboard.courses.views.course_summaries import CourseIndexCSV


@ddt
# pylint: disable=abstract-method
class CourseCSVTestMixin(ViewTestMixin):
    client = None
    column_headings = None
    base_file_name = None

    def assertIsValidCSV(self, course_id, csv_data):
        response = self.client.get(self.path(course_id=course_id))

        # Check content type
        self.assertResponseContentType(response, 'text/csv')

        # Check filename
        csv_prefix = 'edX-DemoX-Demo_2014' if course_id == CourseSamples.DEMO_COURSE_ID else 'edX-DemoX-Demo_Course'
        filename = f'{csv_prefix}--{self.base_file_name}.csv'
        self.assertResponseFilename(response, filename)

        # Check data
        self.assertEqual(response.content.decode(), csv_data)

    def assertResponseContentType(self, response, content_type):
        self.assertEqual(response['Content-Type'], content_type)

    def assertResponseFilename(self, response, filename):
        self.assertEqual(response['Content-Disposition'], f'attachment; filename="{filename}"')

    def _test_csv(self, course_id, csv_data):
        with mock.patch(self.api_method, return_value=csv_data):
            self.assertIsValidCSV(course_id, csv_data)

    @data(CourseSamples.DEMO_COURSE_ID, CourseSamples.DEPRECATED_DEMO_COURSE_ID)
    def test_response_no_data(self, course_id):
        # Create an "empty" CSV that only has headers
        csv_data = convert_list_of_dicts_to_csv([], self.column_headings)
        self._test_csv(course_id, csv_data)

    @data(CourseSamples.DEMO_COURSE_ID, CourseSamples.DEPRECATED_DEMO_COURSE_ID)
    def test_response(self, course_id):
        csv_data = self.get_mock_data(course_id)
        csv_data = convert_list_of_dicts_to_csv(csv_data)
        self._test_csv(course_id, csv_data)

    def test_404(self):
        course_id = 'fakeOrg/soFake/Fake_Course'
        self.grant_permission(self.user, course_id)
        path = reverse(self.viewname, kwargs={'course_id': course_id})

        with mock.patch(self.api_method, side_effect=NotFoundError):
            response = self.client.get(path, follow=True)
            self.assertEqual(response.status_code, 404)


class CourseEnrollmentByCountryCSVViewTests(CourseCSVTestMixin, TestCase):
    viewname = 'courses:csv:enrollment_geography'
    column_headings = ['count', 'country', 'course_id', 'date']
    base_file_name = 'enrollment-location'
    api_method = 'analyticsclient.course.Course.enrollment'

    def get_mock_data(self, course_id):
        return get_mock_api_enrollment_geography_data(course_id)


class CourseEnrollmentCSVViewTests(CourseCSVTestMixin, TestCase):
    viewname = 'courses:csv:enrollment'
    column_headings = ['count', 'course_id', 'date']
    base_file_name = 'enrollment'
    api_method = 'analyticsclient.course.Course.enrollment'

    def get_mock_data(self, course_id):
        return get_mock_api_enrollment_data(course_id)


class CourseEnrollmentModeCSVViewTests(CourseCSVTestMixin, TestCase):
    viewname = 'courses:csv:enrollment'
    column_headings = ['count', 'course_id', 'date', 'audit', 'honor', 'professional', 'verified']
    base_file_name = 'enrollment'
    api_method = 'analyticsclient.course.Course.enrollment'

    def get_mock_data(self, course_id):
        return get_mock_api_enrollment_data(course_id)


class CourseEnrollmentDemographicsByAgeCSVViewTests(CourseCSVTestMixin, TestCase):
    viewname = 'courses:csv:enrollment_demographics_age'
    column_headings = ['birth_year', 'count', 'course_id', 'created', 'date']
    base_file_name = 'enrollment-by-birth-year'
    api_method = 'analyticsclient.course.Course.enrollment'

    def get_mock_data(self, course_id):
        return get_mock_api_enrollment_age_data(course_id)


class CourseEnrollmentDemographicsByEducationCSVViewTests(CourseCSVTestMixin, TestCase):
    viewname = 'courses:csv:enrollment_demographics_education'
    column_headings = ['count', 'course_id', 'created', 'date', 'education_level.name', 'education_level.short_name']
    base_file_name = 'enrollment-by-education'
    api_method = 'analyticsclient.course.Course.enrollment'

    def get_mock_data(self, course_id):
        return get_mock_api_enrollment_education_data(course_id)


class CourseEnrollmentByDemographicsGenderCSVViewTests(CourseCSVTestMixin, TestCase):
    viewname = 'courses:csv:enrollment_demographics_gender'
    column_headings = ['count', 'course_id', 'created', 'date', 'gender']
    base_file_name = 'enrollment-by-gender'
    api_method = 'analyticsclient.course.Course.enrollment'

    def get_mock_data(self, course_id):
        return get_mock_api_enrollment_gender_data(course_id)


class CourseEngagementActivityTrendCSVViewTests(CourseCSVTestMixin, TestCase):
    viewname = 'courses:csv:engagement_activity_trend'
    column_headings = ['any', 'attempted_problem', 'course_id', 'interval_end', 'interval_start',
                       'played_video', 'posted_forum']
    base_file_name = 'engagement-activity'
    api_method = 'analyticsclient.course.Course.activity'

    def get_mock_data(self, course_id):
        return get_mock_api_course_activity(course_id)


@ddt
class PerformanceProblemResponseCSVTests(ViewTestMixin, TestCase):
    viewname = 'courses:csv:performance_problem_responses'
    follow = False  # Inherited methods test_authentication() and test_authorization() should not follow redirects
    success_status = 302
    course_id = 'course-v1:Test+ing+This'
    api_method = 'analyticsclient.course.Course.reports'
    api_response = {
        "course_id": "Test_ing_This",
        "report_name": "problem_response",
        "download_url": "https://bucket.s3.amazonaws.com/Test_ing_This_problem_response.csv?Signature=...",
        "last_modified": "2016-08-12T043411",
        "file_size": 3419,
        "expiration_date": "2016-08-12T233704",
    }
    api_response_minimal = {
        "course_id": "Test_ing_This",
        "report_name": "problem_response",
        "download_url": "https://bucket.s3.amazonaws.com/Test_ing_This_problem_response.csv?Signature=...",
    }

    def get_mock_data(self, course_id):
        return self.api_response.copy()

    @data(api_response, api_response_minimal)
    def test_working_download_redirect(self, api_response):
        """ A user with permission should be able to download a report """
        self.grant_permission(self.user, self.course_id)

        with mock.patch(self.api_method, return_value=api_response.copy()):
            response = self.client.get(self.path(course_id=self.course_id))
            self.assertEqual(response.status_code, self.success_status)
            self.assertEqual(response['Location'], self.api_response["download_url"])

    def test_no_data(self):
        """ Expect a 404 when the report for this course is not available from the API """
        self.grant_permission(self.user, self.course_id)
        with mock.patch(self.api_method, side_effect=NotFoundError):
            response = self.client.get(self.path(course_id=self.course_id))
            self.assertEqual(response.status_code, 404)


@ddt
class CourseIndexCSVTests(ViewTestMixin, TestCase):
    viewname = 'courses:index_csv'
    base_file_name = 'course-list'
    api_method = 'analyticsclient.course_summaries.CourseSummaries.course_summaries'

    def setUp(self):
        self.programs_patch = mock.patch(
            'analytics_dashboard.courses.presenters.programs.ProgramsPresenter.get_programs',
        )
        programs_api = self.programs_patch.start()
        programs_api.return_value = get_mock_programs()
        self.summaries_patch = mock.patch(
            'analytics_dashboard.courses.presenters.course_summaries.CourseSummariesPresenter.get_course_summaries'
        )
        summaries_api = self.summaries_patch.start()
        summaries_api.return_value = (self.get_mock_data([CourseSamples.DEMO_COURSE_ID,
                                                          CourseSamples.DEPRECATED_DEMO_COURSE_ID]), 'timestamp')
        super().setUp()

    def tearDown(self):
        self.programs_patch.stop()
        self.summaries_patch.stop()
        super().tearDown()

    def path(self, **kwargs):
        # This endpoint does not include the course-id, so drop it (along with any other kwargs)
        return reverse(self.viewname)

    def get_mock_data(self, course_ids):
        return get_mock_course_summaries(course_ids)

    def assertIsValidCSV(self, csv_data):
        response = self.client.get(self.path())
        now = timezone.now().replace(microsecond=0)

        if csv_data == '':
            # This is a no-data case, check for 404 status (and nothing else)
            self.assertEqual(response.status_code, 404)
            return

        # Check content type
        self.assertResponseContentType(response, 'text/csv')

        # Check filename
        csv_prefix = now.isoformat()
        filename = f'{csv_prefix}--{self.base_file_name}.csv'
        self.assertResponseFilename(response, filename)

        # Check data
        self.assertEqual(response.content.decode(), csv_data)

    def assertResponseContentType(self, response, content_type):
        self.assertEqual(response['Content-Type'], content_type)

    def assertResponseFilename(self, response, filename):
        self.assertEqual(
            response['Content-Disposition'],
            'attachment; filename="{}"'.format(urllib.parse.quote(filename)),
        )

    def _test_csv(self, mocked_api_response, csv_data):
        presenter_method = \
            'analytics_dashboard.courses.presenters.course_summaries.CourseSummariesPresenter.get_course_summaries'
        with mock.patch(presenter_method,
                        return_value=(mocked_api_response, None)):
            self.assertIsValidCSV(csv_data)

    @override_switch('enable_course_filters', active=True)
    @override_switch('enable_course_passing', active=False)
    @data(
        [CourseSamples.DEMO_COURSE_ID],
        [CourseSamples.DEPRECATED_DEMO_COURSE_ID],
        [CourseSamples.DEMO_COURSE_ID, CourseSamples.DEPRECATED_DEMO_COURSE_ID],
    )
    def test_response_with_programs(self, course_ids):
        summaries_csv = get_mock_course_summaries_csv(course_ids, has_programs=True)
        self._test_csv(get_mock_course_summaries(course_ids, exclude=['passing_users']), summaries_csv)

    @override_switch('enable_course_filters', active=False)
    @override_switch('enable_course_passing', active=False)
    @data(
        [CourseSamples.DEMO_COURSE_ID],
        [CourseSamples.DEPRECATED_DEMO_COURSE_ID],
        [CourseSamples.DEMO_COURSE_ID, CourseSamples.DEPRECATED_DEMO_COURSE_ID],
    )
    def test_response_minimal(self, course_ids):
        summaries_csv = get_mock_course_summaries_csv(course_ids)
        self._test_csv(get_mock_course_summaries(course_ids, exclude=['passing_users']), summaries_csv)

    @override_switch('enable_course_filters', active=False)
    @override_switch('enable_course_passing', active=True)
    @data(
        [CourseSamples.DEMO_COURSE_ID],
        [CourseSamples.DEPRECATED_DEMO_COURSE_ID],
        [CourseSamples.DEMO_COURSE_ID, CourseSamples.DEPRECATED_DEMO_COURSE_ID],
    )
    def test_response_with_passing(self, course_ids):
        summaries_csv = get_mock_course_summaries_csv(course_ids, has_passing=True)
        self._test_csv(get_mock_course_summaries(course_ids), summaries_csv)

    @override_switch('enable_course_filters', active=True)
    @override_switch('enable_course_passing', active=True)
    @data(
        [CourseSamples.DEMO_COURSE_ID],
        [CourseSamples.DEPRECATED_DEMO_COURSE_ID],
        [CourseSamples.DEMO_COURSE_ID, CourseSamples.DEPRECATED_DEMO_COURSE_ID],
    )
    def test_response_with_all(self, course_ids):
        summaries_csv = get_mock_course_summaries_csv(course_ids, has_programs=True, has_passing=True)
        self._test_csv(get_mock_course_summaries(course_ids), summaries_csv)

    def test_response_no_data(self):
        self._test_csv([], '')


# The CSV fields of each column of the course list table, shared with the React page's tests.
CSV_COLUMNS_FIXTURE = (
    Path(__file__).resolve().parents[3]
    / 'static' / 'apps' / 'course-list' / 'react' / 'spec' / 'fixtures' / 'csv-columns.json'
)

PRESENTER_SUMMARIES = (
    'analytics_dashboard.courses.presenters.course_summaries.CourseSummariesPresenter.get_course_summaries'
)


class CourseIndexCSVFilteredTests(ViewTestMixin, TestCase):
    """ The CSV that the React course list page asks for with filtered=true: its search, filters and columns. """
    viewname = 'courses:index_csv'

    ALGEBRA = CourseSamples.DEMO_COURSE_ID
    BIOLOGY = CourseSamples.DEPRECATED_DEMO_COURSE_ID
    DRAWING = 'another/course/id'

    def setUp(self):
        self.programs_patch = mock.patch(
            'analytics_dashboard.courses.presenters.programs.ProgramsPresenter.get_programs',
            return_value=get_mock_programs(),
        )
        self.programs_patch.start()
        super().setUp()

    def tearDown(self):
        self.programs_patch.stop()
        super().tearDown()

    def path(self, **kwargs):
        return reverse(self.viewname)

    def summaries(self):
        """ Algebra (current, instructor-paced), Biology (archived) and Drawing (no availability). """
        summaries = get_mock_course_summaries([self.ALGEBRA, self.BIOLOGY, self.DRAWING])
        summaries[0].update(
            catalog_course_title='Algebra I', catalog_course='Edx+Algebra', availability='Current',
            pacing_type='instructor_paced', b2b_count=4,
        )
        summaries[1].update(
            catalog_course_title='Biology', catalog_course='Edx+Biology', availability='Archived',
            pacing_type='self_paced',
        )
        summaries[2].update(
            catalog_course_title='drawing basics', catalog_course='', availability='', pacing_type='self_paced',
        )
        return summaries

    def get_csv(self, params=None):
        """ Returns the response and, when it is a CSV, its rows as dicts and its header. """
        with mock.patch(PRESENTER_SUMMARIES, return_value=(self.summaries(), None)):
            response = self.client.get(self.path(), params or {})
        content = response.content.decode()
        reader = csv.DictReader(io.StringIO(content))
        return response, list(reader), reader.fieldnames

    def course_ids(self, params):
        return [row['course_id'] for row in self.get_csv(params)[1]]

    @override_switch('enable_course_filters', active=True)
    def test_parameters_are_ignored_without_filtered(self):
        """ The legacy page's link has the same parameter names but not filtered=true: its file is the whole list. """
        whole = self.get_csv()[0].content
        ignored = self.get_csv({'text_search': 'zzz', 'availability': 'Archived', 'cols': 'count'})[0].content

        self.assertEqual(ignored, whole)
        self.assertIn(b'enrollment_modes.audit.count', ignored)

    @override_switch('enable_course_filters', active=True)
    def test_filtered_without_parameters_is_the_whole_list(self):
        self.assertEqual(
            self.course_ids({'filtered': 'true'}),
            [self.ALGEBRA, self.BIOLOGY, self.DRAWING],
        )

    @override_switch('enable_course_filters', active=True)
    def test_the_search_and_the_filters_narrow_the_courses(self):
        """ The rules themselves are checked with the cases shared with the page (the presenter test). """
        self.assertEqual(self.course_ids({'filtered': 'true', 'text_search': 'algebra'}), [self.ALGEBRA])
        self.assertEqual(
            self.course_ids({'filtered': 'true', 'availability': 'Current,Archived', 'pacing_type': 'self_paced'}),
            [self.BIOLOGY],
        )
        self.assertEqual(self.course_ids({'filtered': 'true', 'courses': 'Edx+Biology', 'sales': 'b2b'}), [])

    @override_switch('enable_course_filters', active=True)
    def test_a_long_list_of_values_is_not_cut(self):
        """ Every selected value counts: the length of the URL is the only limit. """
        values = ['x'] * 1000 + ['Edx+Biology']

        self.assertEqual(self.course_ids({'filtered': 'true', 'courses': ','.join(values)}), [self.BIOLOGY])

    @override_switch('enable_course_filters', active=True)
    def test_sales_and_funding_read_only_their_own_segments(self):
        """ The mock summaries have a cumulative_count, but a value from the URL can't make the filter read it. """
        self.assertEqual(self.course_ids({'filtered': 'true', 'sales': 'cumulative'}), [])
        self.assertEqual(self.course_ids({'filtered': 'true', 'funding': 'b2b'}), [])

    @override_switch('enable_course_filters', active=True)
    def test_filters_by_program(self):
        """ Demo Program has Algebra; Demo Program2 has Biology; Demo Program4 has all three. """
        self.assertEqual(
            self.course_ids({'filtered': 'true', 'program_ids': ProgramSamples.DEMO_PROGRAM_ID}),
            [self.ALGEBRA],
        )
        self.assertEqual(
            self.course_ids({
                'filtered': 'true',
                'program_ids': f'{ProgramSamples.DEMO_PROGRAM_ID},{ProgramSamples.DEMO_PROGRAM2_ID}',
            }),
            [self.ALGEBRA, self.BIOLOGY],
        )
        self.assertEqual(
            self.course_ids({'filtered': 'true', 'program_ids': ProgramSamples.DEMO_PROGRAM3_ID}),
            [],
        )

    @override_switch('enable_course_filters', active=False)
    def test_filters_are_ignored_when_the_filters_switch_is_off(self):
        """ The page offers no filters then, but the search still applies. """
        self.assertEqual(
            self.course_ids({'filtered': 'true', 'availability': 'Archived', 'courses': 'Edx+Biology'}),
            [self.ALGEBRA, self.BIOLOGY, self.DRAWING],
        )
        self.assertEqual(self.course_ids({'filtered': 'true', 'text_search': 'biology'}), [self.BIOLOGY])

    @override_switch('enable_course_filters', active=True)
    def test_unknown_parameters_and_empty_values_are_ignored(self):
        self.assertEqual(
            self.course_ids({'filtered': 'true', 'colour': 'red', 'availability': ',', 'pacing_type': ''}),
            [self.ALGEBRA, self.BIOLOGY, self.DRAWING],
        )

    @override_switch('enable_course_filters', active=True)
    def test_an_over_long_search_is_cut(self):
        response, rows, _ = self.get_csv({'filtered': 'true', 'text_search': 'x' * 5000})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(rows, [])

    @override_switch('enable_course_filters', active=True)
    def test_cols_gives_only_the_columns_shown_with_course_name_first(self):
        response, rows, header = self.get_csv({'filtered': 'true', 'cols': 'count,start_date'})

        self.assertEqual(response.status_code, 200)
        # The order of the table, whatever the order of cols; Course Name is the title and the course ID.
        self.assertEqual(header, ['catalog_course_title', 'course_id', 'start_date', 'count'])
        self.assertEqual(rows[0]['count'], '1590')

    @override_switch('enable_course_filters', active=True)
    def test_cols_always_has_course_name(self):
        self.assertEqual(self.get_csv({'filtered': 'true', 'cols': ''})[2], ['catalog_course_title', 'course_id'])
        self.assertEqual(
            self.get_csv({'filtered': 'true', 'cols': 'catalog_course_title'})[2],
            ['catalog_course_title', 'course_id'],
        )

    @override_switch('enable_course_filters', active=True)
    def test_cols_ignores_unknown_ids_and_leaves_hidden_columns_out(self):
        header = self.get_csv({'filtered': 'true', 'cols': 'count,enrollment_modes.audit.count,nonsense'})[2]

        self.assertEqual(header, ['catalog_course_title', 'course_id', 'count'])

    @override_switch('enable_course_filters', active=True)
    def test_cols_maps_the_verified_enrollment_and_program_columns(self):
        _, rows, header = self.get_csv({'filtered': 'true', 'cols': 'verified_enrollment,program'})

        self.assertEqual(header, [
            'catalog_course_title', 'course_id', 'enrollment_modes.verified.count', 'program_titles', 'program_ids',
        ])
        self.assertEqual(rows[0]['enrollment_modes.verified.count'], '557')
        self.assertEqual(rows[0]['program_titles'], 'Demo Program | Demo Program4')

    @override_switch('enable_course_filters', active=True)
    def test_a_selected_column_without_data_is_empty(self):
        """ Sales Model and the other columns waiting for data are in the file, empty, as the table shows "--". """
        _, rows, header = self.get_csv({'filtered': 'true', 'cols': 'sales_model,total_engagements'})

        self.assertEqual(header, ['catalog_course_title', 'course_id', 'total_engagements', 'sales_model'])
        self.assertEqual({row['sales_model'] for row in rows}, {''})
        self.assertEqual({row['total_engagements'] for row in rows}, {''})

    @override_switch('enable_course_filters', active=True)
    def test_filtered_without_cols_has_every_column(self):
        header = self.get_csv({'filtered': 'true', 'availability': 'Archived'})[2]

        self.assertIn('enrollment_modes.audit.count', header)
        self.assertIn('program_titles', header)

    @override_switch('enable_course_filters', active=True)
    def test_no_course_left_gives_the_header_row_alone(self):
        response, rows, header = self.get_csv({'filtered': 'true', 'text_search': 'zzz', 'cols': 'count'})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(rows, [])
        self.assertEqual(header, ['catalog_course_title', 'course_id', 'count'])

    @override_switch('enable_course_filters', active=True)
    def test_no_course_data_at_all_is_still_a_404(self):
        with mock.patch(PRESENTER_SUMMARIES, return_value=([], None)):
            response = self.client.get(self.path(), {'filtered': 'true', 'cols': 'count'})

        self.assertEqual(response.status_code, 404)

    def test_the_columns_are_the_ones_the_react_page_exports(self):
        """ CourseIndexCSV.column_fields and the React page's csv-columns.json list the same columns and fields. """
        expected = json.loads(CSV_COLUMNS_FIXTURE.read_text(encoding='utf-8'))

        self.assertEqual(
            [{'column': column, 'fields': fields} for column, fields in CourseIndexCSV.column_fields],
            expected,
        )
