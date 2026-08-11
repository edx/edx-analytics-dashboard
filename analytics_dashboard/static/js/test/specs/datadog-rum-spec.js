define(['models/course-model', 'models/tracking-model', 'utils/datadog-rum'], (
  CourseModel,
  TrackingModel,
  DatadogRumUtils,
) => {
  'use strict';

  describe('Datadog RUM utils', () => {
    it('redacts sensitive strings', () => {
      const url = 'https://insights.edx.org/u/edxavier?email=edx@example.com&text_search=learner@example.com';

      expect(DatadogRumUtils.sanitizeString(url)).toEqual(
        'https://insights.edx.org/u/[REDACTED]?email=[REDACTED]&text_search=[REDACTED]',
      );
    });

    it('redacts sensitive RUM event fields', () => {
      const event = {
        view: {
          url: 'https://insights.edx.org/courses/?email=edx@example.com',
          name: 'Course list for edx@example.com',
          referrer: 'https://profile.edx.org/u/edxavier',
        },
        resource: {
          url: 'https://insights.edx.org/api/user/v1/accounts/edxavier',
        },
        action: {
          target: {
            name: 'Search learner edx@example.com',
          },
        },
        error: {
          resource: {
            url: 'https://insights.edx.org/courses/?username=edxavier',
          },
        },
      };

      expect(DatadogRumUtils.beforeSend(event)).toBe(true);
      expect(event.view.url).toEqual('https://insights.edx.org/courses/?email=[REDACTED]');
      expect(event.view.name).toEqual('Course list for [REDACTED]');
      expect(event.view.referrer).toEqual('https://profile.edx.org/u/[REDACTED]');
      expect(event.resource.url).toEqual('https://insights.edx.org/api/user/v1/accounts/[REDACTED]');
      expect(event.action.target.name).toEqual('Search learner [REDACTED]');
      expect(event.error.resource.url).toEqual('https://insights.edx.org/courses/?username=[REDACTED]');
    });

    it('builds safe page and course context', () => {
      const courseModel = new CourseModel({
        courseId: 'course-v1:edX+DemoX+Demo_Course',
        org: 'edX',
      });
      const trackingModel = new TrackingModel({
        page: {
          scope: 'course',
          lens: 'enrollment',
          report: 'activity',
          depth: '',
          name: 'course_enrollment_activity',
        },
      });

      expect(DatadogRumUtils.buildRumContext({ courseModel, trackingModel })).toEqual({
        'insights.page_name': 'course_enrollment_activity',
        'insights.page_scope': 'course',
        'insights.page_lens': 'enrollment',
        'insights.page_report': 'activity',
        'insights.course_id': 'course-v1:edX+DemoX+Demo_Course',
        'insights.org': 'edX',
      });
    });
  });
});
