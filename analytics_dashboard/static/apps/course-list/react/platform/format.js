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
