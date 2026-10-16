import {
  formatCount, formatDate, formatPercent, formatSummaryNumber,
} from 'course-list/react/platform/format';

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

describe('table formatting', () => {
  it('formats the dates the Analytics API sends ("2017-01-10T182754"), like the legacy table', () => {
    expect(formatDate('2017-01-10T182754')).toBe('01/10/2017');
    expect(formatDate('2017-01-10T000000')).toBe('01/10/2017');
  });

  it('formats dates in UTC with moment\'s "L" format, like the legacy table', () => {
    expect(formatDate('2016-04-13T00:00:00Z')).toBe('04/13/2016');
    expect(formatDate('2016-04-13T23:30:00Z')).toBe('04/13/2016');
    expect(formatDate('2024-01-02')).toBe('01/02/2024');
  });

  it('gives an empty string for a missing or invalid date', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('not a date')).toBe('');
  });

  it('formats a fraction as a whole percentage', () => {
    expect(formatPercent(0.256)).toBe('26%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent('n/a')).toBe('');
  });
});
