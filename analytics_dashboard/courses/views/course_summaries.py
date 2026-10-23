import logging

from braces.views import LoginRequiredMixin
from django.core.exceptions import PermissionDenied
from django.http import Http404
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
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
# text, the most values of one filter, and the ids of the filters that narrow the list (registries/filters.js).
MAX_SEARCH_LENGTH = 200
MAX_FILTER_VALUES = 500
FILTER_IDS = ('availability', 'pacing_type', 'program_ids', 'courses', 'sales', 'funding')


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
    filters (text_search and the ids in FILTER_IDS, in the page's address format) and only the columns it shows (cols,
    the ids of the table's columns). Without filtered=true the parameters are ignored, so the legacy download is
    unchanged.
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
    # CSV fields each one exports. A column whose data the API doesn't send yet exports empty cells.
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
                    filters[filter_id] = values[:MAX_FILTER_VALUES]
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

        presenter = CourseSummariesPresenter(analytics_client=self.analytics_client)
        summaries, _ = presenter.get_course_summaries(courses)

        if not summaries:
            # Instead of returning a useless blank CSV, return a 404 error
            raise Http404

        programs = []
        if enable_course_filters:
            programs_presenter = ProgramsPresenter(analytics_client=self.analytics_client)
            programs = programs_presenter.get_programs(course_ids=courses)

        header = None
        if self.request.GET.get('filtered') == 'true':
            search, filters, columns = self.get_page_query(enable_course_filters)
            summaries = presenter.filter_by_query(summaries, search, filters, programs)
            if columns is not None:
                header = self.get_header(columns)

        # Exclude specified fields from each summary entry
        summaries = [remove_keys(summary, self.exclude_fields) for summary in summaries]

        if enable_course_filters:
            # Add list of associated program IDs to each summary entry
            for summary in summaries:
                summary_programs = [program for program in programs if summary['course_id'] in program['course_ids']]
                summary['program_ids'] = ' | '.join([program['program_id'] for program in summary_programs])
                summary['program_titles'] = ' | '.join([program['program_title'] for program in summary_programs])

        if header:
            # Only these fields, in this order. With no course left, the file is the header row alone.
            return self.renderer.render(summaries, renderer_context={'header': header})
        return self.renderer.render(summaries)
