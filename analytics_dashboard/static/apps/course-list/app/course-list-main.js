/* global initModelData */
import 'backgrid-paginator/backgrid-paginator.min.css';

import loadReactPage, { showLoadError } from 'course-list/app/react-loader';

// initModelData is set by the Django template (see load/init-models.js). It is read here, before the page
// model exists, so the Backbone app's chunk is only requested when it is going to be used.
const reactPageEnabled = Boolean((initModelData.course || {}).enable_react_course_list);

if (reactPageEnabled) {
  // The React page replaces the whole Backbone course list (see react-loader.js).
  import('load/init-page').then((page) => {
    loadReactPage(page.models.courseModel, { trackingModel: page.models.trackingModel });
  }).catch(error => showLoadError('start_error', error));
} else {
  Promise.all([
    import('load/init-page'),
    import('apps/course-list/app/app'),
  ]).then(([page, { default: CourseListApp }]) => {
    const modelData = page.models.courseModel;
    const app = new CourseListApp({
      containerSelector: '.course-list-app-container',
      courseListJson: modelData.get('course_list_json'),
      programsJson: modelData.get('programs_json'),
      courseListDownloadUrl: modelData.get('course_list_download_url'),
      filteringEnabled: modelData.get('enable_course_filters'),
      passingUsersEnabled: modelData.get('enable_passing_users'),
    });

    app.start();
  });
}
