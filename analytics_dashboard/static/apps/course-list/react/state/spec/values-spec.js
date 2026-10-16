import {
  dateValue, isEmpty, isNumericCell, toNumber,
} from 'course-list/react/state/values';

describe('row value helpers', () => {
  it('knows which values are empty', () => {
    [null, undefined, ''].forEach(value => expect(isEmpty(value)).toBe(true));
    [0, '0', false, 'a'].forEach(value => expect(isEmpty(value)).toBe(false));
  });

  it('knows which cell types hold numbers', () => {
    expect(isNumericCell('number')).toBe(true);
    expect(isNumericCell('percent')).toBe(true);
    ['date', 'text', 'courseName'].forEach(cell => expect(isNumericCell(cell)).toBe(false));
  });

  it('turns numbers and numeric text into numbers, and anything else into null', () => {
    expect(toNumber(12)).toBe(12);
    expect(toNumber(0)).toBe(0);
    expect(toNumber('12')).toBe(12);
    expect(toNumber(' 1.5 ')).toBe(1.5);
    [NaN, Infinity, 'abc', '', '  ', null, undefined, {}, [], true].forEach(value => expect(toNumber(value)).toBeNull());
  });

  it('gives the same sort value for the same moment in the API\'s formats, and null for no date', () => {
    expect(dateValue('2017-01-10T000000')).toBe(dateValue('2017-01-10T00:00:00Z'));
    expect(dateValue('2017-01-10T182754')).toBeGreaterThan(dateValue('2017-01-10T000000'));
    expect(dateValue('not a date')).toBeNull();
    expect(dateValue('')).toBeNull();
    expect(dateValue(null)).toBeNull();
  });
});
