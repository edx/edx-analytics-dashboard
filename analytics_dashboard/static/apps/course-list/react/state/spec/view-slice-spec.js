import reducer, { columnsChanged } from 'course-list/react/state/view-slice';

describe('view slice', () => {
  it('starts with the default columns (visibleColumns is null)', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual({ visibleColumns: null });
  });

  it('stores the chosen column ids', () => {
    expect(reducer(undefined, columnsChanged(['start_date', 'count'])).visibleColumns).toEqual(['start_date', 'count']);
  });

  it('ignores anything that is not a column id', () => {
    expect(reducer(undefined, columnsChanged(['count', 7, null, 'start_date'])).visibleColumns).toEqual(['count', 'start_date']);
  });
});
