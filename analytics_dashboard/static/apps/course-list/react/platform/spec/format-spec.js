import { formatCount, formatSummaryNumber } from 'course-list/react/platform/format';

const card = require('course-list/react/spec/fixtures/total-enrollment-card.json');

describe('summary number formatting', () => {
  card.cases.forEach(({ value, title, display }) => {
    it(`formats ${value} like templates/summary_point.html`, () => {
      expect(formatSummaryNumber(value)).toEqual({ full: title, display });
    });
  });

  it('shows 0 when the value is missing', () => {
    expect(formatSummaryNumber(undefined)).toEqual({ full: '0', display: '0' });
  });

  it('formats whole numbers with grouping separators', () => {
    expect(formatCount(1234)).toBe('1,234');
  });
});
