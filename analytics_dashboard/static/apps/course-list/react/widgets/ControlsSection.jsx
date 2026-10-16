import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import CheckboxDropdown from 'course-list/react/components/controls/CheckboxDropdown';
import SearchBox from 'course-list/react/components/controls/SearchBox';
import TimeframeDropdown from 'course-list/react/components/controls/TimeframeDropdown';
import {
  filterChanged, searchChanged, selectQuery, timeframeChanged,
} from 'course-list/react/state/query-slice';
import { selectFilters } from 'course-list/react/state/selectors';

/**
 * The filter bar, in the prototype's order: the search box, Timeframe (when timeframeEnabled), and one dropdown for
 * each entry of the filters registry that has options (only when the server enabled the filters). The callbacks are
 * for analytics. Download CSV is in the results toolbar (ResultsSection).
 */
export default function ControlsSection({
  filtersEnabled, timeframeEnabled, pendingFiltersShown, onSearch, onFilter,
}) {
  const dispatch = useDispatch();
  const { search, filters, timeframe } = useSelector(selectQuery);
  const filterEntries = useSelector(state => selectFilters(state, pendingFiltersShown));
  // A filter is shown when it has options, or when something in it is still selected (so it can be unticked).
  const isShown = filter => filter.options.length || (filters[filter.id] || []).length;

  return (
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
  // Called with the selected values of a filter after a change.
  onFilter: PropTypes.func,
};

ControlsSection.defaultProps = {
  filtersEnabled: false,
  timeframeEnabled: false,
  pendingFiltersShown: false,
  onSearch: () => {},
  onFilter: () => {},
};
