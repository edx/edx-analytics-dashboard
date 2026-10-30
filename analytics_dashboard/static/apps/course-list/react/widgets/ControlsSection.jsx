import { useRef } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import AppliedFilters from 'course-list/react/components/controls/AppliedFilters';
import CheckboxDropdown from 'course-list/react/components/controls/CheckboxDropdown';
import SearchBox from 'course-list/react/components/controls/SearchBox';
import TimeframeDropdown, { TIMEFRAME_RANGES, today } from 'course-list/react/components/controls/TimeframeDropdown';
import { formatDate } from 'course-list/react/platform/format';
import {
  DEFAULT_TIMEFRAME, filterChanged, filtersCleared, searchChanged, selectQuery, timeframeChanged,
} from 'course-list/react/state/query-slice';
import { selectFilters } from 'course-list/react/state/selectors';

// A YYYY-MM-DD date as the table shows dates (MM/DD/YYYY in English, as in the design); '--' when there is none.
const chipDate = date => formatDate(date) || '--';

// The text of the Timeframe chip, as in the design: the range's label, or for Custom its dates (To is today when it
// isn't set).
function timeframeText({ range, from, to }) {
  if (range === 'custom') {
    return `${chipDate(from)} to ${chipDate(to || today())}`;
  }
  const known = TIMEFRAME_RANGES.find(option => option.value === range);
  return known ? known.label : range;
}

// Whether a timeframe narrows anything: not All Time, nor Custom without dates (as in the prototype).
const isTimeframeApplied = ({ range, from, to }) => range !== DEFAULT_TIMEFRAME.range
  && !(range === 'custom' && !from && !to);

/**
 * The chips of the applied filters, in the filter bar's order: Timeframe when it is applied (only while its menu is
 * shown), then each filter of `filterEntries` with a selection, its values' labels joined by commas (a value its
 * options no longer have shows as is). Returns [{ id, label, value }].
 */
export function appliedFilterChips({ filters, timeframe }, filterEntries, timeframeEnabled) {
  const chips = [];
  if (timeframeEnabled && timeframe && isTimeframeApplied(timeframe)) {
    chips.push({ id: 'timeframe', label: 'Timeframe', value: timeframeText(timeframe) });
  }
  filterEntries.forEach((filter) => {
    const values = filters[filter.id] || [];
    if (values.length) {
      const labelOf = (value) => {
        const option = filter.options.find(item => item.value === value);
        return option ? option.label : value;
      };
      chips.push({ id: filter.id, label: filter.label, value: values.map(labelOf).join(', ') });
    }
  });
  return chips;
}

/**
 * The filter bar, in the prototype's order: the search box, Timeframe (when timeframeEnabled), and one dropdown for
 * each entry of the filters registry that has options (only when the server enabled the filters). Under it, the
 * applied filters as chips (AppliedFilters). The callbacks are for analytics. Download CSV is in the results toolbar
 * (ResultsSection).
 */
export default function ControlsSection({
  filtersEnabled, timeframeEnabled, pendingFiltersShown, onSearch, onFilter,
}) {
  const dispatch = useDispatch();
  const controls = useRef(null);
  const query = useSelector(selectQuery);
  const { search, filters, timeframe } = query;
  const filterEntries = useSelector(state => selectFilters(state, pendingFiltersShown));
  // Every filter, also one waiting for data that the bar doesn't show: a selection in it (from the address) still
  // narrows the list, so it gets a chip that can remove it.
  const allFilterEntries = useSelector(state => selectFilters(state, true));
  // A filter is shown when it has options, or when something in it is still selected (so it can be unticked).
  const isShown = filter => filter.options.length || (filters[filter.id] || []).length;
  const chips = filtersEnabled ? appliedFilterChips(query, allFilterEntries, timeframeEnabled) : [];

  const removeChip = (id) => {
    if (id === 'timeframe') {
      dispatch(timeframeChanged(DEFAULT_TIMEFRAME));
    } else {
      dispatch(filterChanged({ id, values: [] }));
      onFilter([]);
    }
  };
  const clearChips = () => {
    const hadFilters = chips.some(chip => chip.id !== 'timeframe');
    dispatch(filtersCleared());
    if (hadFilters) {
      onFilter([]);
    }
  };
  const focusSearch = () => {
    const input = controls.current && controls.current.querySelector('.insights-controls input[type="search"]');
    if (input) {
      input.focus();
    }
  };

  return (
    <div ref={controls}>
      <div className="insights-controls">
        <SearchBox value={search} onChange={text => dispatch(searchChanged(text))} onSubmit={onSearch} />
        {filtersEnabled && timeframeEnabled && (
          // The server doesn't send data by date yet (LP-1321): the chosen range is kept but changes no number.
          <TimeframeDropdown value={timeframe} onChange={value => dispatch(timeframeChanged(value))} />
        )}
        {filtersEnabled && filterEntries.filter(isShown).map(filter => (
          <CheckboxDropdown
            key={filter.id}
            id={filter.id}
            label={filter.label}
            options={filter.options}
            searchLabel={filter.searchLabel || ''}
            selected={filters[filter.id] || []}
            onChange={(values) => {
              dispatch(filterChanged({ id: filter.id, values }));
              onFilter(values);
            }}
          />
        ))}
      </div>
      <AppliedFilters chips={chips} onRemove={removeChip} onClear={clearChips} onEmptied={focusSearch} />
    </div>
  );
}

ControlsSection.propTypes = {
  filtersEnabled: PropTypes.bool,
  // Whether the Timeframe menu is shown: for now only in the preview, while its data is missing.
  timeframeEnabled: PropTypes.bool,
  // Whether the filters waiting for data (Sales Model, Funding Model) are shown before it comes: in the preview.
  pendingFiltersShown: PropTypes.bool,
  // Called with the search text when Enter is pressed.
  onSearch: PropTypes.func,
  // Called with the selected values of a filter after a change (an empty list when a chip or Clear removes filters).
  onFilter: PropTypes.func,
};

ControlsSection.defaultProps = {
  filtersEnabled: false,
  timeframeEnabled: false,
  pendingFiltersShown: false,
  onSearch: () => {},
  onFilter: () => {},
};
