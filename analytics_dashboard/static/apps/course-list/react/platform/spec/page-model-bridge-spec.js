import CourseModel from 'models/course-model';
import { resetMonitoringForTests } from 'components/react/monitoring';
import createCourseListStore from 'course-list/react/state/store';
import connectPageModelToStore, { toSummaryPayload } from 'course-list/react/platform/page-model-bridge';
import { selectSummaryText, selectTotalEnrollment } from 'course-list/react/state/summary-slice';

describe('connectPageModelToStore', () => {
  const summaryText = {
    total_enrollment: { label: 'Total Enrollment', tooltip: 'Total enrollments across all of your courses.' },
  };
  const summary = value => ({
    total_enrollment: value,
    current_enrollment: 101,
    enrollment_change_7_days: 202,
    verified_enrollment: 303,
    masters_enrollment: 404,
  });
  let originalRum;
  let rum;
  let courseModel;
  let store;

  beforeEach(() => {
    resetMonitoringForTests();
    originalRum = window.DD_RUM;
    rum = {
      addError: jasmine.createSpy('addError'),
      addAction: jasmine.createSpy('addAction'),
    };
    window.DD_RUM = rum;
    // The monitoring adapter logs reported failures to the console in development builds.
    spyOn(console, 'error');
    courseModel = new CourseModel({ summary: summary(3378149), summary_text: summaryText });
    store = createCourseListStore();
  });

  afterEach(() => {
    window.DD_RUM = originalRum;
  });

  it('maps the server keys to store keys', () => {
    expect(toSummaryPayload(summary(1), summaryText)).toEqual({
      metrics: {
        totalEnrollment: 1,
        currentEnrollment: 101,
        enrollmentChange7Days: 202,
        verifiedEnrollment: 303,
        mastersEnrollment: 404,
      },
      text: { totalEnrollment: summaryText.total_enrollment },
    });
    expect(toSummaryPayload(undefined, null)).toEqual({ metrics: {}, text: {} });
  });

  it('loads the page model into the store when connected', () => {
    connectPageModelToStore(courseModel, store);

    expect(selectTotalEnrollment(store.getState())).toBe(3378149);
    expect(selectSummaryText(store.getState(), 'totalEnrollment')).toEqual(summaryText.total_enrollment);
    expect(rum.addError).not.toHaveBeenCalled();
  });

  it('updates the store when the page model gets a valid value', () => {
    connectPageModelToStore(courseModel, store);
    courseModel.set('summary', summary(3378150));

    expect(selectTotalEnrollment(store.getState())).toBe(3378150);
    expect(rum.addError).not.toHaveBeenCalled();
  });

  it('keeps the previous value and reports once when the page model gets invalid values', () => {
    connectPageModelToStore(courseModel, store);
    courseModel.set('summary', summary('3,378,149'));
    courseModel.set('summary', summary(NaN));

    expect(selectTotalEnrollment(store.getState())).toBe(3378149);
    expect(rum.addError).toHaveBeenCalledTimes(1);
    const context = rum.addError.calls.argsFor(0)[1];
    expect(context['insights.react.widget']).toBe('summary');
    expect(context['insights.react.failure_type']).toBe('invalid_update');
    expect(context['insights.react.recovery']).toBe('kept_last_value');
  });

  it('stops updating the store once disconnected', () => {
    const disconnect = connectPageModelToStore(courseModel, store);
    disconnect();
    courseModel.set('summary', summary(1));

    expect(selectTotalEnrollment(store.getState())).toBe(3378149);
  });
});
