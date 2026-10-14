import { act } from 'react';
import { createRoot } from 'react-dom/client';

import ParagonProvider from 'components/react/paragon/ParagonProvider';
import SummaryCard from 'course-list/react/components/SummaryCard';

const axe = require('axe-core');
const card = require('course-list/react/spec/fixtures/total-enrollment-card.json');

describe('SummaryCard', () => {
  let element;
  let root;
  let onTooltipShown;

  // TotalEnrollment's widget passes 0 for a loaded null value, like the template's default_if_none:0.
  const renderCard = ({ value, label = card.label, tooltip = card.tooltip }) => {
    act(() => {
      root.render(
        <ParagonProvider>
          <SummaryCard
            value={value === null ? 0 : value}
            label={label}
            tooltip={tooltip}
            tooltipId="summary-tooltip-test"
            onTooltipShown={onTooltipShown}
          />
        </ParagonProvider>,
      );
    });
  };

  const helpButton = () => element.querySelector('button');
  // Only Paragon's tooltips: other specs can leave legacy Bootstrap 3 tooltips (.tooltip) in the body.
  const tooltips = () => document.querySelectorAll('.tooltip[class*="bs-tooltip-"]');

  // PhantomJS has no MouseEvent constructor, so events are created the old way. They bubble, which is how
  // React receives them.
  const fire = (target, type) => {
    const event = document.createEvent('Event');
    event.initEvent(type, true, true);
    act(() => {
      target.dispatchEvent(event);
    });
  };

  beforeEach(() => {
    setFixtures('<div id="summary-card"></div>');
    element = document.getElementById('summary-card');
    root = createRoot(element);
    onTooltipShown = jasmine.createSpy('onTooltipShown');
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('is a Paragon card inside the paragon-styles scope', () => {
    renderCard({ value: card.cases[0].value });

    expect(element.querySelector('.paragon-styles .pgn__card')).not.toBeNull();
  });

  card.cases.forEach(({ value, title, display }) => {
    it(`shows ${value} formatted like the legacy card, with the full number in the title`, () => {
      renderCard({ value });

      const number = element.querySelector('.h2');
      expect(number.textContent).toBe(display);
      expect(number.getAttribute('title')).toBe(title);
    });
  });

  it('shows the label', () => {
    renderCard({ value: card.cases[0].value });

    expect(element.querySelector('.h4').textContent).toBe(card.label);
  });

  it('gives screen readers the description without opening the tooltip, like the legacy card', () => {
    renderCard({ value: card.cases[0].value });

    const hidden = element.querySelector('.sr-only');
    expect(hidden.textContent).toBe(card.tooltip);
    expect(tooltips().length).toBe(0);
  });

  it('has a help button that screen readers can name', () => {
    renderCard({ value: card.cases[0].value });

    expect(helpButton().getAttribute('aria-label')).toBe(`${card.label} help`);
  });

  it('shows the tooltip text when the help button gets focus or hover, and tells the caller', () => {
    renderCard({ value: card.cases[0].value });
    expect(tooltips().length).toBe(0);

    fire(helpButton(), 'mouseover');

    expect(tooltips().length).toBe(1);
    expect(tooltips()[0].textContent).toBe(card.tooltip);
    expect(onTooltipShown).toHaveBeenCalledWith(card.label);
  });

  it('removes the tooltip when the card is removed', () => {
    renderCard({ value: card.cases[0].value });
    fire(helpButton(), 'mouseover');
    expect(tooltips().length).toBe(1);

    act(() => root.unmount());
    root = createRoot(element);

    expect(tooltips().length).toBe(0);
  });

  it('does not violate the axe-core ruleset', (done) => {
    renderCard({ value: card.cases[0].value });

    axe.a11yCheck(element, (result) => {
      expect(result.violations.length).toBe(0);
      done();
    });
  });
});
