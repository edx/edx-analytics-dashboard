import reducer, { columnsChanged } from 'course-list/react/state/view-slice';

describe('view slice', () => {
  it('starts with the default columns', () => {
    expect(reducer(undefined, { type: 'init' })).toEqual({ visibleColumns: null });
  });

  it('stores the ticked columns, keeping only ids', () => {
    expect(reducer(undefined, columnsChanged(['start_date', 3, 'count'])).visibleColumns)
      .toEqual(['start_date', 'count']);
  });
});
