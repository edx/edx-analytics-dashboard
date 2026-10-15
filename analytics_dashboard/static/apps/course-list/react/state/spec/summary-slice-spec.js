import reducer, { selectSummaryText, summaryTextLoaded } from 'course-list/react/state/summary-slice';

describe('summary slice', () => {
  const text = { total_enrollment: { label: 'Total Enrollment', tooltip: 'Help text.' } };

  it('starts with no text', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual({ text: {} });
  });

  it('stores the text of the cards when it is loaded, replacing what it had', () => {
    const state = reducer(undefined, summaryTextLoaded(text));

    expect(state.text).toEqual(text);
    expect(reducer(state, summaryTextLoaded({})).text).toEqual({});
  });

  it('selects the text from the store state', () => {
    expect(selectSummaryText({ summary: reducer(undefined, summaryTextLoaded(text)) })).toEqual(text);
  });
});
