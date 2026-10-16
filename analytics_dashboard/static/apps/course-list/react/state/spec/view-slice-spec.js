import reducer, { columnsChanged, viewRestored } from 'course-list/react/state/view-slice';

describe('view slice', () => {
  it('starts with the default columns', () => {
    expect(reducer(undefined, { type: 'init' })).toEqual({ visibleColumns: null, urlInvalid: false });
  });

  it('stores the ticked columns, keeping only ids', () => {
    expect(reducer(undefined, columnsChanged(['start_date', 3, 'count'])).visibleColumns)
      .toEqual(['start_date', 'count']);
  });

  it('restores the ticked columns and whether the address was invalid', () => {
    const state = reducer(
      { visibleColumns: ['count'], urlInvalid: false },
      viewRestored({ visibleColumns: null, invalid: true }),
    );

    expect(state).toEqual({ visibleColumns: null, urlInvalid: true });
    expect(reducer(state, viewRestored({ visibleColumns: ['count'] }))).toEqual({
      visibleColumns: ['count'], urlInvalid: false,
    });
  });
});
