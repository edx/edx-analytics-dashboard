"""
This module contains various configuration toggles
for edx's analytics dashboard.
"""


from edx_toggles.toggles import SettingToggle
from waffle import flag_is_active, switch_is_active

# .. toggle_name: ENROLLMENT_AGE_AVAILABLE
# .. toggle_implementation: SettingToggle
# .. toggle_default: True
# .. toggle_description: Turn this toggle on to show age demographic information in the analytics dashboard.
#      Turn it off if your installation cannot or does not collect or share age information.
# .. toggle_use_cases: opt_out
# .. toggle_creation_date: 2021-01-12
# .. toggle_tickets: https://openedx.atlassian.net/browse/MST-1241
ENROLLMENT_AGE_AVAILABLE = SettingToggle('ENROLLMENT_AGE_AVAILABLE', default=True)


def age_available():
    return ENROLLMENT_AGE_AVAILABLE.is_enabled()


# .. toggle_name: enable_react_course_list
# .. toggle_implementation: WaffleFlag
# .. toggle_default: False
# .. toggle_description: Renders the course list page's React widgets (first: the Total Enrollment summary card)
#      instead of the server-rendered versions. When off, the page is unchanged and the React code is not
#      downloaded. Evaluated once per request in CourseIndex.get_context_data.
# .. toggle_use_cases: temporary
# .. toggle_creation_date: 2026-10-13
# .. toggle_target_removal_date: 2027-04-30
ENABLE_REACT_COURSE_LIST_FLAG = 'enable_react_course_list'


def react_course_list_enabled(request):
    """ Returns True if the course list should render its React widgets for this request. """
    return flag_is_active(request, ENABLE_REACT_COURSE_LIST_FLAG)


# .. toggle_name: enable_lms_global_staff_all_courses
# .. toggle_implementation: WaffleSwitch
# .. toggle_default: False
# .. toggle_description: When on, users the LMS reported as global staff at their last Insights login can see every
#      course without Insights asking the LMS for their course list (for global staff the LMS returns every course).
#      When off, Insights asks the LMS for their course list, as before.
# .. toggle_use_cases: opt_in
# .. toggle_creation_date: 2026-11-27
LMS_GLOBAL_STAFF_ALL_COURSES_SWITCH = 'enable_lms_global_staff_all_courses'


def lms_global_staff_all_courses_enabled():
    """ Returns True if LMS global staff should get every course without the LMS course list call. """
    return switch_is_active(LMS_GLOBAL_STAFF_ALL_COURSES_SWITCH)
