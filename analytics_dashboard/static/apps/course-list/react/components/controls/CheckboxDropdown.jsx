import { useState } from 'react';
import PropTypes from 'prop-types';

import FilterDropdown from 'course-list/react/components/controls/FilterDropdown';
import MenuOption from 'course-list/react/components/controls/MenuOption';
import SearchBox from 'course-list/react/components/controls/SearchBox';

// The most options a searchable menu lists at once, as in the prototype: typing narrows the rest down.
const MAX_SEARCH_RESULTS = 50;

/**
 * A button that opens a menu of checkboxes: the sample for every multiple-choice filter, and the Columns menu.
 * onChange is called with the new list of selected values. The button shows how many values are selected, unless
 * showCount is false; icon is an optional icon component before the label. searchLabel puts a search box with that
 * placeholder at the top of the menu, which lists the options whose label has the text (ignoring case); it is emptied
 * when the menu closes.
 */
export default function CheckboxDropdown({
  id, label, options, selected, onChange, icon, showCount, searchLabel,
}) {
  const [search, setSearch] = useState('');
  // The options selected when the menu opened: the ones a long list puts first. Ticking one while it's open doesn't
  // move it, so the next click lands where the user aims. While the menu is closed they are the current selection,
  // so the list is already in its order when it opens.
  const [openSelection, setOpenSelection] = useState(null);
  const pinned = openSelection || selected;
  const isSelected = option => selected.indexOf(option.value) !== -1;
  const isPinned = option => pinned.indexOf(option.value) !== -1;
  // A selected value the options no longer have (the data changed) stays listed, as is, so it can be unticked.
  const known = options.map(option => option.value);
  const listed = options.concat(selected.filter(value => known.indexOf(value) === -1)
    .map(value => ({ value, label: value })));
  // The new selection is kept in the order of the list, so the analytics value does not depend on the clicks.
  const toggle = (value, checked) => onChange(
    listed.map(option => option.value)
      .filter(item => (item === value ? checked : selected.indexOf(item) !== -1)),
  );
  const text = search.trim().toLowerCase();
  const matching = searchLabel
    ? listed.filter(option => option.label.toLowerCase().indexOf(text) !== -1)
    : listed;
  // A long list is cut at MAX_SEARCH_RESULTS, the options selected when the menu opened first, so the cut never hides
  // one.
  const shown = matching.length > MAX_SEARCH_RESULTS
    ? matching.filter(isPinned)
      .concat(matching.filter(option => !isPinned(option)))
      .slice(0, Math.max(MAX_SEARCH_RESULTS, pinned.length))
    : matching;

  return (
    <FilterDropdown
      id={id}
      label={showCount && selected.length ? `${label} (${selected.length})` : label}
      icon={icon}
      menuClassName={searchLabel ? 'insights-checkbox-menu-searchable' : ''}
      onToggle={(isOpen) => {
        if (isOpen) {
          setOpenSelection(selected);
        } else {
          setOpenSelection(null);
          setSearch('');
        }
      }}
    >
      {searchLabel && (
        <SearchBox
          value={search}
          onChange={setSearch}
          label={searchLabel}
          clearable={false}
          landmark={false}
          className="insights-checkbox-menu-search"
        />
      )}
      {/* The options scroll under the search box, which stays in view. */}
      <div className="insights-checkbox-menu-options">
        {shown.map(option => (
          <MenuOption
            key={option.value}
            label={option.label}
            checked={isSelected(option)}
            onChange={event => toggle(option.value, event.target.checked)}
          />
        ))}
        {searchLabel && !shown.length && <div className="insights-menu-note">No matches</div>}
        {shown.length < matching.length && (
          <div className="insights-menu-note">{`Showing ${shown.length} of ${matching.length}`}</div>
        )}
      </div>
    </FilterDropdown>
  );
}

CheckboxDropdown.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
  })).isRequired,
  selected: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  icon: PropTypes.elementType,
  showCount: PropTypes.bool,
  searchLabel: PropTypes.string,
};

CheckboxDropdown.defaultProps = {
  icon: null,
  showCount: true,
  searchLabel: '',
};
