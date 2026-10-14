import { act } from 'react';
import $ from 'jquery';

import CourseModel from 'models/course-model';
import { resetMonitoringForTests } from 'components/react/monitoring';
import ignoreExpectedErrors from 'components/react/spec/ignore-expected-errors';
import startReactWidgets from 'course-list/react/index';

const card = require('course-list/react/spec/fixtures/total-enrollment-card.json');

const WRAPPER_CLASS = 'col col-12 sm-col-12 md-col-3';

// Same markup as templates/summary_point.html renders, without the whitespace between tags.
const serverCard = ({ title, display }) => '<div class="summary-point text-center">'
  + '<div class="summary-point-wrapper">'
  + `<div class="summary-point-number" title="${title}">${display}</div>`
  + `<div class="summary-point-label">${card.label}</div>`
  + '<div class="summary-point-help">'
  + `<span class="sr-only">${card.tooltip}</span>`
  + `<span data-toggle="tooltip" data-placement="top" title="${card.tooltip}"`
  + ' data-track-event="edx.bi.tooltip.displayed"'
  + ` data-track-title="${card.label}"`
  + ' data-track-category="summary"'
  + ' data-track-type="tooltip"'
  + ' class="ico ico-tooltip fa fa-info-circle has-tooltip" aria-hidden="true"></span>'
  + '</div></div></div>';

// mountReact restores the HTML in a microtask scheduled during React's commit; these run after it.
const afterRestore = (assertions, done) => {
  Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => {
      assertions();
      done();
    })
    .catch(done.fail);
};

describe('startReactWidgets', () => {
  const [first, second] = card.cases;
  const summaryText = { total_enrollment: { label: card.label, tooltip: card.tooltip } };
  const summary = value => ({
    total_enrollment: value,
    current_enrollment: 101,
    enrollment_change_7_days: 202,
    verified_enrollment: 303,
    masters_enrollment: 404,
  });
  let originalRum;
  let rum;
  let restoreOnError;
  let wrapper;

  const setServerPage = (cardHtml) => {
    setFixtures(
      `<div class="${WRAPPER_CLASS}" data-stat-type="total_enrollment" data-react-widget="total-enrollment">`
      + `${cardHtml}</div>`,
    );
    wrapper = document.querySelector('[data-react-widget="total-enrollment"]');
    // On the page, load/init-tooltips.js activates the server-rendered tooltips before React mounts.
    $(wrapper).find('.has-tooltip').tooltip();
  };
  const number = () => wrapper.querySelector('.summary-point-number');

  beforeEach(() => {
    restoreOnError = ignoreExpectedErrors(['Total enrollment data is not available.']);
    resetMonitoringForTests();
    originalRum = window.DD_RUM;
    rum = {
      addError: jasmine.createSpy('addError'),
      addAction: jasmine.createSpy('addAction'),
    };
    window.DD_RUM = rum;
    // React and the monitoring adapter log caught errors to the console in development builds.
    spyOn(console, 'error');
    setServerPage(serverCard(first));
  });

  afterEach(() => {
    window.DD_RUM = originalRum;
    restoreOnError();
  });

  it('replaces the server-rendered card with the React card inside the same wrapper', () => {
    const courseModel = new CourseModel({ summary: summary(first.value), summary_text: summaryText });
    const serverText = wrapper.textContent;
    const serverNumber = number();

    act(() => {
      startReactWidgets({ courseModel });
    });

    expect(wrapper.className).toBe(WRAPPER_CLASS);
    expect(wrapper.getAttribute('data-stat-type')).toBe('total_enrollment');
    expect(wrapper.children.length).toBe(1);
    expect(number()).not.toBe(serverNumber);
    expect(wrapper.textContent).toBe(serverText);
    expect(number().getAttribute('title')).toBe(first.title);
    expect($(wrapper).find('.has-tooltip').data('bs.tooltip')).toBeDefined();
    expect(rum.addError).not.toHaveBeenCalled();
    expect(rum.addAction).not.toHaveBeenCalled();
  });

  it('updates the card when the page model gets a new valid value', () => {
    const courseModel = new CourseModel({ summary: summary(first.value), summary_text: summaryText });
    act(() => {
      startReactWidgets({ courseModel });
    });

    act(() => {
      courseModel.set('summary', summary(second.value));
    });

    expect(number().textContent).toBe(second.display);
    expect(number().getAttribute('title')).toBe(second.title);
    expect(rum.addError).not.toHaveBeenCalled();
  });

  it('keeps the latest valid value when the page model gets an invalid one', () => {
    const courseModel = new CourseModel({ summary: summary(first.value), summary_text: summaryText });
    act(() => {
      startReactWidgets({ courseModel });
    });
    act(() => {
      courseModel.set('summary', summary(second.value));
    });

    act(() => {
      courseModel.set('summary', summary('3,378,149'));
    });

    expect(number().textContent).toBe(second.display);
    expect(rum.addError).toHaveBeenCalledTimes(1);
    expect(rum.addError.calls.argsFor(0)[1]['insights.react.failure_type']).toBe('invalid_update');
  });

  it('leaves the server-rendered card in place when the page has no summary data', (done) => {
    const courseModel = new CourseModel({});
    const serverHtml = wrapper.innerHTML;

    act(() => {
      startReactWidgets({ courseModel });
    });

    afterRestore(() => {
      expect(wrapper.innerHTML).toBe(serverHtml);
      expect(wrapper.className).toBe(WRAPPER_CLASS);
    }, done);
  });

  it('does nothing when the page has no Total Enrollment card', () => {
    setFixtures('<div class="course-list-app-container"></div>');
    const courseModel = new CourseModel({ summary: summary(first.value), summary_text: summaryText });
    let store;

    act(() => {
      store = startReactWidgets({ courseModel });
    });

    expect(store.getState().summary.metrics.totalEnrollment).toBe(first.value);
    expect(rum.addError).not.toHaveBeenCalled();
  });
});
