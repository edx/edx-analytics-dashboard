import logging
from datetime import datetime

from analyticsclient.exceptions import InvalidRequestError, NotFoundError
from analyticsclient.exceptions import TimeoutError as AnalyticsTimeoutError
from braces.views import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.http import Http404, JsonResponse
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.views.generic import View
from rest_framework_csv.renderers import CSVRenderer
from waffle import switch_is_active

from analytics_dashboard.core.utils import remove_keys
from analytics_dashboard.courses import permissions
from analytics_dashboard.courses.presenters.course_summaries import CourseSummariesPresenter
from analytics_dashboard.courses.presenters.programs import ProgramsPresenter
from analytics_dashboard.courses.views import (
    CourseAPIMixin,
    LastUpdatedView,
    LazyEncoderMixin,
    TemplateView,
    TrackedViewMixin,
    AnalyticsV1Mixin,
)
from analytics_dashboard.courses.views.csv import DatetimeCSVResponseMixin
from analytics_dashboard.courses.waffle import react_course_list_enabled

logger = logging.getLogger(__name__)

# What the course list page may send in the link of its Download CSV button (see CourseIndexCSV): the longest search
# text (the page's search box and address stop at the same length) and the ids of the filters that narrow the list
# (registries/filters.js). The number of values of a filter is limited by the length of the URL, which the web server
# enforces.
MAX_SEARCH_LENGTH = 200
FILTER_IDS = ('availability', 'pacing_type', 'program_ids', 'courses', 'sales', 'funding')
# The Timeframe menu's ranges of a fixed number of days (static/apps/course-list/react/components/controls/
# TimeframeDropdown.jsx), as the page writes them in its address.
TIMEFRAME_DAYS = {'7d': 7, '30d': 30, '60d': 60}


def get_date_range(params):
    """
    Returns the Analytics API's date range for the course list page's Timeframe, read from `params` in the page's
    address format (timeframe, and with custom: from and to), or None for All Time.

    7d, 30d and 60d are the last 7, 30 or 60 days of the data ({'last_days': N}: only the API knows its latest date);
    custom is from and to, both included ({'start_date', 'end_date'}), when both are real dates and from is not after
    to. Anything else is All Time, as the page shows it.
    """
    timeframe = params.get('timeframe')
    if timeframe in TIMEFRAME_DAYS:
        return {'last_days': TIMEFRAME_DAYS[timeframe]}
    if timeframe == 'custom':
        try:
            start_date = datetime.strptime(params.get('from', ''), '%Y-%m-%d').date()
            end_date = datetime.strptime(params.get('to', ''), '%Y-%m-%d').date()
        except ValueError:
            return None
        if start_date <= end_date:
            return {'start_date': start_date.isoformat(), 'end_date': end_date.isoformat()}
    return None


class CourseIndex(AnalyticsV1Mixin, CourseAPIMixin, LoginRequiredMixin, TrackedViewMixin, LastUpdatedView,
                  LazyEncoderMixin, TemplateView):
    template_name = 'courses/index.html'
    page_title = _('Courses')
    page_name = {
        'scope': 'insights',
        'lens': 'home',
        'report': '',
        'depth': ''
    }
    # Translators: Do not translate UTC.
    update_message = _('Course summary data was last updated %(update_date)s at %(update_time)s UTC.')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        courses = permissions.get_user_course_permissions(user)
        if not courses and not (user.is_superuser or user.is_staff):
            # The user is probably not a course administrator and should not be using this application.
            raise PermissionDenied

        summaries_presenter = CourseSummariesPresenter(analytics_client=self.analytics_client)
        summaries, last_updated = summaries_presenter.get_course_summaries(courses)
        summary = summaries_presenter.get_course_summary_metrics(summaries)
        react_enabled = react_course_list_enabled(self.request)

        context.update({
            'update_message': self.get_last_updated_message(last_updated)
        })

        enable_course_filters = switch_is_active('enable_course_filters')
        data = {
            'course_list_json': summaries,
            'enable_course_filters': enable_course_filters,
            'enable_passing_users': switch_is_active('enable_course_passing'),
            'course_list_download_url': reverse('courses:index_csv'),
        }

        if enable_course_filters:
            programs_presenter = ProgramsPresenter(analytics_client=self.analytics_client)
            programs = programs_presenter.get_programs(course_ids=courses)
            data['programs_json'] = programs

        if react_enabled:
            # Only sent when the flag is on, so the flag-off page data stays exactly as it was.
            data['enable_react_course_list'] = True
            # Where the React page gets the course rows of a Timeframe (CourseIndexJSON).
            data['course_list_rows_url'] = reverse('courses:index_json')
            # Not read by the React page, which computes the summary cards from the course rows so they can follow
            # the filters. Kept so the page data stays as it was until all the cards are built.
            data['summary'] = summary
            # The cards in the order of registries/metrics.js. The labels of the five cards the legacy page also has
            # use the same message IDs as courses/index.html, so both versions show the same translations; Total
            # Engagements is new. The tooltips are new text (the prototype's), because the React cards count only the
            # courses that match the search and the filters: they show in English until they are translated.
            data['summary_text'] = {
                'total_enrollment': {
                    'label': _('Total Enrollment'),
                    # Translators: The help text of a summary card. The filters are those of the course list below it.
                    'tooltip': _('Total enrollments in the courses matching your filters.'),
                },
                'current_enrollment': {
                    'label': _('Current Enrollment'),
                    'tooltip': _('Current enrollments in the courses matching your filters.'),
                },
                # Only on the React page: the API doesn't send the data yet, so the card shows "--".
                'total_engagements': {
                    # Translators: This is a label to identify the number of learners active in all of the
                    # instructor's courses.
                    'label': _('Total Engagements'),
                    'tooltip': _('Active learners in the courses matching your filters.'),
                },
                'enrollment_change_7_days': {
                    'label': _('Change in Last Week'),
                    'tooltip': _('Change in enrollment last week in the courses matching your filters.'),
                },
                'verified_enrollment': {
                    'label': _('Verified Enrollment'),
                    'tooltip': _('Verified enrollments in the courses matching your filters.'),
                },
                'masters_enrollment': {
                    'label': _("Master's Enrollment"),
                    'tooltip': _("Master's enrollments in the courses matching your filters."),
                },
            }

        context['js_data']['course'] = data
        context['page_data'] = self.get_page_data(context)
        context['summary'] = summary
        context['enable_react_course_list'] = react_enabled

        return context


class CourseIndexCSV(AnalyticsV1Mixin, CourseAPIMixin, LoginRequiredMixin, DatetimeCSVResponseMixin, TemplateView):
    """
    The CSV of the course list. Without parameters it is the whole list, as the legacy page downloads it.

    The React page's link adds filtered=true, and then the file has the courses the page shows for its search and
    filters (text_search and the ids in FILTER_IDS, in the page's address format), the numbers of its Timeframe
    (timeframe, from, to; see get_date_range) and only the columns it shows (cols, the ids of the table's columns).
    Without filtered=true the parameters are ignored, so the legacy download is unchanged.
    """

    csv_filename_suffix = 'course-list'
    # Note: we are not using the DRF "renderer_classes" field here because this is a Django view, not a DRF view.
    # We will call the render function on the renderer directly instead.
    renderer = CSVRenderer()
    exclude_fields = {
        '': ('created',),
        'enrollment_modes': {
            'audit': ('count_change_7_days',),
            'credit': ('count_change_7_days',),
            'honor': ('count_change_7_days',),
            'professional': ('count_change_7_days',),
            'verified': ('count_change_7_days',),
            'masters': ('count_change_7_days',),
        }
    }

    # The columns of the course list table (static/apps/course-list/react/registries/columns.js), in its order, and the
    # CSV fields each one exports. The shared fixture spec/fixtures/csv-columns.json holds this list, so a column added
    # to one side and not the other fails a test. A column whose data the API doesn't send yet exports empty cells.
    column_fields = [
        ('catalog_course_title', ['catalog_course_title', 'course_id']),
        ('start_date', ['start_date']),
        ('end_date', ['end_date']),
        ('cumulative_count', ['cumulative_count']),
        ('count', ['count']),
        ('total_engagements', ['total_engagements']),
        ('engagement_rate', ['engagement_rate']),
        ('count_change_7_days', ['count_change_7_days']),
        ('verified_enrollment', ['enrollment_modes.verified.count']),
        ('passing_users', ['passing_users']),
        ('program', ['program_titles', 'program_ids']),
        ('sales_model', ['sales_model']),
        ('funding_model', ['funding_model']),
        ('b2b_count', ['b2b_count']),
        ('b2c_count', ['b2c_count']),
        ('subscription_count', ['subscription_count']),
        ('alacarte_count', ['alacarte_count']),
    ]

    def get_page_query(self, enable_course_filters):
        """
        Returns the search, the filters ({filter id: [values]}) and the ids of the columns that the page asked for
        (None when it sent no cols). Filters are read only when the filters switch is on, as the page offers them
        only then. Whatever is not a known name is ignored.
        """
        params = self.request.GET
        search = params.get('text_search', '')[:MAX_SEARCH_LENGTH]
        filters = {}
        if enable_course_filters:
            for filter_id in FILTER_IDS:
                values = [value for value in params.get(filter_id, '').split(',') if value]
                if values:
                    filters[filter_id] = values
        columns = params['cols'].split(',') if 'cols' in params else None
        return search, filters, columns

    def get_header(self, columns):
        """ The CSV fields of the table columns in `columns`, in the table's order. Course Name is always there. """
        return [
            field
            for column_id, fields in self.column_fields
            if column_id == 'catalog_course_title' or column_id in columns
            for field in fields
        ]

    def get_data(self):
        user = self.request.user
        courses = permissions.get_user_course_permissions(user)
        if not courses and not (user.is_superuser or user.is_staff):
            # The user is probably not a course administrator and should not be using this application.
            raise PermissionDenied

        enable_course_filters = switch_is_active('enable_course_filters')
        filtered = self.request.GET.get('filtered') == 'true'
        # The Timeframe is part of the filter bar, which the page shows only with the filters switch on.
        date_range = get_date_range(self.request.GET) if filtered and enable_course_filters else None

        presenter = CourseSummariesPresenter(analytics_client=self.analytics_client)
        summaries, _ = presenter.get_course_summaries(courses, date_range=date_range)

        if not summaries:
            # Instead of returning a useless blank CSV, return a 404 error
            raise Http404

        programs = []
        if enable_course_filters:
            programs_presenter = ProgramsPresenter(analytics_client=self.analytics_client)
            programs = programs_presenter.get_programs(course_ids=courses)
        programs_by_course = presenter.programs_by_course(programs)

        header = None
        if filtered:
            search, filters, columns = self.get_page_query(enable_course_filters)
            summaries = presenter.filter_by_query(summaries, search, filters, programs_by_course)
            if columns is not None:
                header = self.get_header(columns)

        # Exclude specified fields from each summary entry
        summaries = [remove_keys(summary, self.exclude_fields) for summary in summaries]

        if enable_course_filters:
            # Add list of associated program IDs to each summary entry
            for summary in summaries:
                summary_programs = programs_by_course.get(summary['course_id'], [])
                summary['program_ids'] = ' | '.join([program['program_id'] for program in summary_programs])
                summary['program_titles'] = ' | '.join([program['program_title'] for program in summary_programs])

        if header:
            # Only these fields, in this order. With no course left, the file is the header row alone.
            return self.renderer.render(summaries, renderer_context={'header': header})
        return self.renderer.render(summaries)


class CourseIndexJSON(AnalyticsV1Mixin, LoginRequiredMixin, View):
    """
    The course rows of the React course list for its Timeframe, as {"course_list_json": [...]}: the rows the page has
    in its page data, with the numbers of the range in timeframe, from and to (see get_date_range; All Time without
    them). The page asks for them when its Timeframe changes. Only with the enable_react_course_list flag on.

    When the API has no summaries for the user's courses the list is empty. When it can't give a date range (it
    reads its data from where there are no daily counts) the answer is a 400, and when it times out a 503.
    """

    # A request without a login gets a 403 rather than the login page, which a script can't use.
    raise_exception = True

    def get(self, request, *args, **kwargs):
        if not react_course_list_enabled(request):
            raise Http404
        user = request.user
        courses = permissions.get_user_course_permissions(user)
        if not courses and not (user.is_superuser or user.is_staff):
            # The user is probably not a course administrator and should not be using this application.
            raise PermissionDenied

        # The Timeframe is part of the filter bar, which the page shows only with the filters switch on.
        date_range = get_date_range(request.GET) if switch_is_active('enable_course_filters') else None
        presenter = CourseSummariesPresenter(analytics_client=self.analytics_client)
        try:
            summaries, _ = presenter.get_course_summaries(courses, date_range=date_range)
        except NotFoundError:
            summaries = []
        except InvalidRequestError:
            logger.warning('The Analytics API refused the course list date range %s for user %s.', date_range, user.id)
            return JsonResponse({'error': 'The course list is not available for this timeframe.'}, status=400)
        except AnalyticsTimeoutError:
            logger.warning('The Analytics API timed out on the course list for user %s.', user.id)
            return JsonResponse({'error': 'The course list took too long to load.'}, status=503)
        return JsonResponse({'course_list_json': summaries})
