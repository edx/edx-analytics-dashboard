from django.contrib.auth.models import AnonymousUser
from django.test import RequestFactory, TestCase
from waffle.testutils import override_flag

from analytics_dashboard.courses.waffle import ENABLE_REACT_COURSE_LIST_FLAG, react_course_list_enabled


class ReactCourseListFlagTests(TestCase):
    def setUp(self):
        super().setUp()
        self.request = RequestFactory().get('/courses/')
        self.request.user = AnonymousUser()

    def test_flag_name(self):
        self.assertEqual(ENABLE_REACT_COURSE_LIST_FLAG, 'enable_react_course_list')

    def test_off_when_flag_does_not_exist(self):
        self.assertFalse(react_course_list_enabled(self.request))

    @override_flag(ENABLE_REACT_COURSE_LIST_FLAG, active=False)
    def test_off_when_flag_is_off(self):
        self.assertFalse(react_course_list_enabled(self.request))

    @override_flag(ENABLE_REACT_COURSE_LIST_FLAG, active=True)
    def test_on_when_flag_is_on(self):
        self.assertTrue(react_course_list_enabled(self.request))
