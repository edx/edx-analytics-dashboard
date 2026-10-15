import { act } from 'react';
import { createRoot } from 'react-dom/client';
import $ from 'jquery';

import SummaryCard from 'course-list/react/components/SummaryCard';

const axe = require('axe-core');
const card = require('course-list/react/spec/fixtures/total-enrollment-card.json');

describe('SummaryCard', () => {
  let element;
  let root;

  // TotalEnrollmentWidget passes 0 for a loaded null value, like the template's default_if_none:0.
  const renderCard = ({ value, label = card.label, tooltip = card.tooltip }) => {
    act(() => {
      root.render(<SummaryCard value={value === null ? 0 : value} label={label} tooltip={tooltip} />);
    });
  };

  const icon = () => element.querySelector('.summary-point-help .has-tooltip');

  beforeEach(() => {
    setFixtures('<div id="summary-card"></div>');
    element = document.getElementById('summary-card');
    root = createRoot(element);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  card.cases.forEach(({ value, title, display }) => {
    it(`renders the legacy summary_point.html structure for ${value}`, () => {
      renderCard({ value });

      expect(element.children.length).toBe(1);
      const point = element.firstElementChild;
      expect(point.className).toBe('summary-point text-center');
      expect(point.children.length).toBe(1);
      const wrapper = point.firstElementChild;
      expect(wrapper.className).toBe('summary-point-wrapper');
      expect(Array.from(wrapper.children).map(child => child.className)).toEqual([
        'summary-point-number', 'summary-point-label', 'summary-point-help',
      ]);

      const number = wrapper.querySelector('.summary-point-number');
      expect(number.getAttribute('title')).toBe(title);
      expect(number.textContent).toBe(display);
      expect(wrapper.querySelector('.summary-point-label').textContent).toBe(card.label);

      const help = wrapper.querySelector('.summary-point-help');
      expect(help.children.length).toBe(2);
      expect(help.firstElementChild.className).toBe('sr-only');
      expect(help.firstElementChild.textContent).toBe(card.tooltip);
    });
  });

  it('renders the tooltip icon with the legacy attributes', () => {
    renderCard({ value: card.cases[0].value });

    expect(icon().tagName).toBe('SPAN');
    expect(icon().className).toBe('ico ico-tooltip fa fa-info-circle has-tooltip');
    expect(icon().getAttribute('data-toggle')).toBe('tooltip');
    expect(icon().getAttribute('data-placement')).toBe('top');
    expect(icon().getAttribute('data-track-event')).toBe('edx.bi.tooltip.displayed');
    expect(icon().getAttribute('data-track-title')).toBe(card.label);
    expect(icon().getAttribute('data-track-category')).toBe('summary');
    expect(icon().getAttribute('data-track-type')).toBe('tooltip');
    expect(icon().getAttribute('aria-hidden')).toBe('true');
    expect(icon().textContent).toBe('');
    // Bootstrap moves the title into data-original-title when it activates the tooltip, as it does for the
    // server-rendered card.
    expect(icon().getAttribute('data-original-title')).toBe(card.tooltip);
  });

  it('activates the Bootstrap tooltip after mounting and destroys it after unmounting', () => {
    renderCard({ value: card.cases[0].value });
    const tooltipIcon = icon();

    expect($(tooltipIcon).data('bs.tooltip')).toBeDefined();

    act(() => root.unmount());

    expect($(tooltipIcon).data('bs.tooltip')).toBeUndefined();
  });

  it('updates the tooltip when its text changes', () => {
    renderCard({ value: card.cases[0].value });
    renderCard({ value: card.cases[0].value, tooltip: 'New help text' });

    expect(icon().getAttribute('data-original-title')).toBe('New help text');
    expect($(icon()).data('bs.tooltip')).toBeDefined();
  });

  it('does not violate the axe-core ruleset', (done) => {
    renderCard({ value: card.cases[0].value });

    axe.a11yCheck(element, (result) => {
      expect(result.violations.length).toBe(0);
      done();
    });
  });
});
