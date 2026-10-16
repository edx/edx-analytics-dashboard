import moment from 'moment';

// Small pure helpers for reading the values of a course row, shared by the selectors (sorting) and the table cells.

export const isEmpty = value => value === null || value === undefined || value === '';

const NUMERIC_CELLS = ['number', 'percent'];

/** Whether a column of the columns registry holds numbers (its `cell` is 'number' or 'percent'). */
export const isNumericCell = cell => NUMERIC_CELLS.indexOf(cell) !== -1;

/** A number for a value the server sent: a number, or a string holding one ("12"). null for anything else. */
export function toNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

/**
 * The moment of a date as a number, for sorting. The Analytics API sends dates like "2017-01-10T182754", which moment
 * only parses with its default format given (as the legacy table's cell does). null for a missing or invalid date.
 */
export function dateValue(value) {
  if (isEmpty(value)) {
    return null;
  }
  const date = moment.utc(value, moment.defaultFormat);
  return date.isValid() ? date.valueOf() : null;
}
