import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@openedx/paragon';
import { Close } from '@openedx/paragon/icons';

/**
 * The applied filters, under the filter bar as in the approved design (the prototype's proposal view): one chip per
 * filter with a selection, "<Filter name>: <Selected values>", in the bar's order, then a Clear link that removes them
 * all. Nothing is drawn when no filter is applied. As in the prototype, a chip is the legacy page's default button
 * (Paragon's outline-secondary Button themed as .insights-default-button, like the bar's dropdowns) with a ✖ after the
 * text: the whole chip removes its filter. Clear is a link button. The chips stay on one line, which scrolls sideways
 * when they don't fit.
 *
 * The removed chip goes away, so when it was used from the keyboard the focus moves to the chip that takes its place
 * (or the one before it), and to onEmptied (the page puts it back in the search box) once no chip is left. A mouse
 * click moves no focus, as in the prototype, so nothing gets a focus outline.
 */
export default function AppliedFilters({
  chips, onRemove, onClear, onEmptied,
}) {
  const group = useRef(null);
  // The position of the chip that had the focus when it was removed from the keyboard, until the chips are drawn again.
  const focusAt = useRef(null);
  // A button pressed with Enter or Space reports a click with no mouse clicks counted (detail 0).
  const fromKeyboard = event => !event || !event.detail;

  useEffect(() => {
    if (focusAt.current === null) {
      return;
    }
    const buttons = group.current ? group.current.querySelectorAll('.insights-applied-filter') : [];
    if (buttons.length) {
      buttons[Math.min(focusAt.current, buttons.length - 1)].focus();
    } else {
      onEmptied();
    }
    focusAt.current = null;
  }, [chips, onEmptied]);

  if (!chips.length) {
    return null;
  }

  return (
    <div ref={group} className="insights-applied-filters" role="group" aria-label="Applied filters">
      <ul className="insights-applied-filters-list">
        {chips.map((chip, index) => {
          const text = `${chip.label}: ${chip.value}`;
          return (
            <li key={chip.id}>
              <Button
                variant="outline-secondary"
                className="insights-default-button insights-applied-filter"
                title={text}
                aria-label={`Remove filter ${text}`}
                iconAfter={Close}
                onClick={(event) => {
                  focusAt.current = fromKeyboard(event) ? index : null;
                  onRemove(chip.id);
                }}
              >
                {text}
              </Button>
            </li>
          );
        })}
        <li>
          <Button
            variant="link"
            className="insights-applied-filters-clear"
            aria-label="Clear all filters"
            onClick={(event) => {
              focusAt.current = fromKeyboard(event) ? 0 : null;
              onClear();
            }}
          >
            Clear
          </Button>
        </li>
      </ul>
    </div>
  );
}

AppliedFilters.propTypes = {
  // [{ id, label, value }]: id is the filter's (or 'timeframe'), label its name, value the selected values as text.
  chips: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
  })).isRequired,
  // Called with the id of the chip that was used.
  onRemove: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  // Called when the last chip is gone, to put the focus somewhere useful.
  onEmptied: PropTypes.func,
};

AppliedFilters.defaultProps = {
  onEmptied: () => {},
};
