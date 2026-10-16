import moment from 'moment';

import Utils from 'utils/utils';

/** Formats a whole number for the current language (Globalize), like the rest of the course list. */
export function formatCount(value) {
  return Utils.localizeNumber(value, 0);
}

/**
 * Formats a summary card number exactly as templates/summary_point.html does: missing values show 0
 * (default_if_none:0); the full number goes in the title; the visible text is cut to 13 characters,
 * ending with "…" (truncatechars:13).
 */
export function formatSummaryNumber(value) {
  const full = formatCount(value === null || value === undefined ? 0 : value);
  const display = full.length > 13 ? `${full.slice(0, 12)}…` : full;
  return { full, display };
}

/**
 * Formats a date as the legacy course table does (backgrid-moment-cell: parsed with moment's default format, in UTC,
 * shown in moment's "L" format in the user's language). The Analytics API sends dates like "2017-01-10T182754", which
 * moment only parses with its default format given. Returns '' for a missing or invalid date; the table shows "--".
 */
export function formatDate(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const date = moment.utc(value, moment.defaultFormat);
  if (!date.isValid()) {
    return '';
  }
  // locale() without a language is a getter, so it is only called with one (window.language is set on the page).
  const language = Utils.getMomentLocale();
  return (language ? date.locale(language) : date).format('L');
}

/** Formats a fraction (0.25) as a whole percentage ("25%"); '' when the value isn't a number. */
export function formatPercent(value) {
  return Number.isFinite(value) ? `${formatCount(Math.round(value * 100))}%` : '';
}
