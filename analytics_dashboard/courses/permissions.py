import datetime
import logging
import zlib

from auth_backends.backends import EdXOAuth2
from django.conf import settings
from django.core.cache import cache
from edx_django_utils.monitoring import set_custom_metric
from edx_rest_api_client.client import OAuthAPIClient

from analytics_dashboard.courses.exceptions import PermissionsRetrievalFailedError

logger = logging.getLogger(__name__)

# This is the course-level role (defined in the edx-platform course_api
# djangoapp) which we assume while querying the courses list API.  This limits
# the result to courses that the target user only has staff access to.
ROLE_FOR_ALLOWED_COURSES = 'staff'

# Part of the permission cache keys. Change it when the stored format changes, so that code running the old format
# during a deployment never reads entries in the new one.
COURSE_PERMISSIONS_CACHE_VERSION = 2


def _get_course_permission_cache_keys(user):
    """
    Return the cache keys used for user-course permissions
    """
    key_last_updated = f'course_permissions_updated_at_v{COURSE_PERMISSIONS_CACHE_VERSION}_{user.id}'
    key_courses = f'course_permissions_v{COURSE_PERMISSIONS_CACHE_VERSION}_{user.id}'
    return key_courses, key_last_updated


def _compress_courses(courses):
    """
    Return the course IDs, sorted, as compressed bytes. A plain list of tens of thousands of course IDs is larger
    than the memcached item size limit, so it would not be stored.
    """
    return zlib.compress('\n'.join(sorted(courses)).encode('utf-8'))


def _decompress_courses(data):
    """
    Return the list of course IDs stored by _compress_courses.
    """
    text = zlib.decompress(data).decode('utf-8')
    return text.split('\n') if text else []


def _get_tracking_cache_key(user):
    """
    Return the cache keys used for user tracking_id
    """
    return f'user_tracking_id_{user.id}'


def set_user_course_permissions(user, courses):
    """
    Sets which courses user is allowed to view.

    Arguments
        user (User)     --  User for which permissions should be set
        courses (list)  --  List of course ID strings
    """
    if not user:
        raise ValueError('User not specified!')

    if courses is None:
        raise ValueError('Courses not specified!')

    # Ensure courses are stored as a list.
    courses = list(courses)

    key_courses, key_last_updated = _get_course_permission_cache_keys(user)

    data = {key_courses: _compress_courses(courses), key_last_updated: datetime.datetime.utcnow()}
    cache.set_many(data, settings.COURSE_PERMISSIONS_TIMEOUT)


def revoke_user_course_permissions(user):
    """
    Revokes all course permissions for the given user.

    Arguments
        user (User) --  User for which permissions should be revoked
    """
    cache.delete_many(_get_course_permission_cache_keys(user))


def get_user_tracking_id(user):
    """
    Returns the tracking ID associated with this user or None. The tracking ID
    is cached.
    """
    cache_key = _get_tracking_cache_key(user)
    tracking_id = cache.get(cache_key)

    # if tracking ID was not found in cache, fetch and cache it
    if tracking_id is None:
        # first, attempt to get the tracking id from an oauth2 social_auth record
        tracking_id = _get_lms_user_id_from_social_auth(user)
        cache.set(cache_key, tracking_id)

    set_custom_metric('tracking_id', tracking_id)
    return tracking_id


def _get_lms_user_id_from_social_auth(user):
    """ Return the lms user id for the user if found. """
    try:
        return user.social_auth.filter(provider=EdXOAuth2.name).order_by('-id').first().extra_data.get('user_id')
    except Exception:  # pylint: disable=broad-except
        logger.warning(
            'Exception retrieving lms_user_id from social_auth for user %s. Defaulting to None.',
            user.id,
            exc_info=True
        )
    return None


def get_user_course_permissions(user):
    """
    Return list of courses accessible by user or None to represent all courses.

    Arguments
        user (User) --  User for which course permissions should be returned
    """
    # ensure we don't request course permissions for users which would return all courses
    if user.is_superuser or user.is_staff:
        return None

    key_courses, key_last_updated = _get_course_permission_cache_keys(user)
    keys = [key_courses, key_last_updated]

    # Check the cache for data
    values = cache.get_many(keys)
    courses = values.get(key_courses)

    # If data is not in the cache, refresh the permissions and validate against the new data. The course list can be
    # missing while its last update time is cached (for example, if the cache could not store or kept only one of
    # them), so a missing list also means a refresh rather than a user with no courses.
    if courses is None or not values.get(key_last_updated):
        return _refresh_user_course_permissions(user)

    return _decompress_courses(courses)


def user_can_view_course(user, course_id):
    """
    Returns boolean indicating if specified user can view specified course.

    Arguments:
        user (User)     --  User whose permissions are being checked
        course_id (str) --  Course to check

    Returns:
        bool -- True, if user can view course; otherwise, False.
    """

    if user.is_superuser or user.is_staff:
        return True

    courses = get_user_course_permissions(user)

    return course_id in courses


def _refresh_user_course_permissions(user):
    """
    Refresh user course permissions from the auth server.

    Arguments
        user (User) --  User whose permissions should be refreshed
    """
    response_data = None
    try:
        client = OAuthAPIClient(
            settings.BACKEND_SERVICE_EDX_OAUTH2_PROVIDER_URL,
            settings.BACKEND_SERVICE_EDX_OAUTH2_KEY,
            settings.BACKEND_SERVICE_EDX_OAUTH2_SECRET,
        )
        course_ids = []
        page = 1

        while page:
            logger.debug('Retrieving page %d of course_ids...', page)
            response = client.get(
                settings.COURSE_API_URL + 'course_ids/',
                params={
                    'username': user.username,
                    'role': ROLE_FOR_ALLOWED_COURSES,
                    'page': page,
                    'page_size': 1000,
                },
                timeout=(3.05, 55),  # the course_ids API can be slow, so use a higher READ timeout
            )
            response_data = response.json()
            response.raise_for_status()  # response_data could be an error response

            course_ids += response_data['results']

            # ensure the next param is a string to avoid infinite loops for mock objects
            if response_data['pagination']['next'] and isinstance(response_data['pagination']['next'], str):
                page += 1
            else:
                page = None
                logger.debug('Completed retrieval of course_ids. Retrieved info for %d courses.', len(course_ids))

        allowed_courses = list(set(course_ids))

    except Exception as e:
        logger.exception(
            "Unable to retrieve course permissions for username=%s and response=%s",
            user.username,
            response_data
        )
        raise PermissionsRetrievalFailedError(e) from e

    set_user_course_permissions(user, allowed_courses)

    return allowed_courses
