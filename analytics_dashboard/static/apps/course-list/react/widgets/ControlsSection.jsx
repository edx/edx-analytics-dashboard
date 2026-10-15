import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';

import CheckboxDropdown from 'course-list/react/components/controls/CheckboxDropdown';
import DownloadCsvButton from 'course-list/react/components/controls/DownloadCsvButton';
import SearchBox from 'course-list/react/components/controls/SearchBox';
import filterRegistry from 'course-list/react/registries/filters';
import { filterChanged, searchChanged, selectQuery } from 'course-list/react/state/query-slice';

/**
 * The filter bar: the search box, one dropdown for each entry of the filters registry (only when the server enabled
 * the filters), and Download CSV (only when the server sent its URL). The callbacks are for analytics.
 */
export default function ControlsSection({
  filtersEnabled, downloadUrl, onSearch, onFilter, onDownload,
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
      {downloadUrl && <DownloadCsvButton url={downloadUrl} onClick={onDownload} />}
    </div>
  );
}

ControlsSection.propTypes = {
  filtersEnabled: PropTypes.bool,
  downloadUrl: PropTypes.string,
  // Called with the search text when Enter is pressed.
  onSearch: PropTypes.func,
  // Called with the selected values of a filter after a change.
  onFilter: PropTypes.func,
  onDownload: PropTypes.func,
};

ControlsSection.defaultProps = {
  filtersEnabled: false,
  downloadUrl: '',
  onSearch: () => {},
  onFilter: () => {},
  onDownload: () => {},
};
