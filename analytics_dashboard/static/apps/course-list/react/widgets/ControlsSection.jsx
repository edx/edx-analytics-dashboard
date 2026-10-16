import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import CheckboxDropdown from 'course-list/react/components/controls/CheckboxDropdown';
import SearchBox from 'course-list/react/components/controls/SearchBox';
import filterRegistry from 'course-list/react/registries/filters';
import { filterChanged, searchChanged, selectQuery } from 'course-list/react/state/query-slice';

/**
 * The filter bar: the search box, and one dropdown for each entry of the filters registry (only when the server
 * enabled the filters). The callbacks are for analytics. Download CSV is in the results toolbar (ResultsSection).
 */
export default function ControlsSection({
  filtersEnabled, onSearch, onFilter,
}) {
  const dispatch = useDispatch();
  const { search, filters } = useSelector(selectQuery);

  return (
    <div className="insights-controls">
      <SearchBox value={search} onChange={text => dispatch(searchChanged(text))} onSubmit={onSearch} />
      {filtersEnabled && filterRegistry.map(filter => (
        <CheckboxDropdown
          key={filter.id}
          id={filter.id}
          label={filter.label}
          options={filter.options}
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
  // Called with the search text when Enter is pressed.
  onSearch: PropTypes.func,
  // Called with the selected values of a filter after a change.
  onFilter: PropTypes.func,
};

ControlsSection.defaultProps = {
  filtersEnabled: false,
  onSearch: () => {},
  onFilter: () => {},
};
