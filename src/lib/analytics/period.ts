/**
 * Calendar helpers for analytics, pinned to UTC.
 *
 * Rollup documents are keyed by UTC day, so every label the dashboard shows is
 * formatted in UTC too — otherwise a chart bucket and its caption could name
 * different days for a reader east of Greenwich.
 */

const DAY_MS = 86_400_000;

const SHORT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const FULL = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const MONTH = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const TIMESTAMP = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const SEARCH_TERMS = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function parseDay(day: string): Date | null {
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** UTC calendar day as `YYYY-MM-DD`. */
export function utcDay(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function shiftDay(day: string, offset: number): string {
  const date = parseDay(day);
  return date ? utcDay(new Date(date.getTime() + offset * DAY_MS)) : day;
}

/** `count` consecutive days ending at `endDay`, oldest first. */
export function listDays(endDay: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => shiftDay(endDay, index - count + 1));
}

export function formatDayShort(day: string): string {
  const date = parseDay(day);
  return date ? SHORT.format(date) : day;
}

export function formatDayFull(day: string): string {
  const date = parseDay(day);
  return date ? FULL.format(date) : day;
}

export function formatMonth(day: string): string {
  const date = parseDay(day);
  return date ? MONTH.format(date) : day;
}

/** "18 Aug 2026, 14:03" — the timestamp shown on a visit row. */
export function formatVisitTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : TIMESTAMP.format(date);
}

/**
 * Every way a reader might type this date: the ISO day, the spelled-out date,
 * the month on its own, the year, the weekday. This is what makes "August",
 * "2026-08" and "Tuesday" all work in one free-text box.
 */
export function dateSearchText(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = utcDay(date);
  return `${day} ${SEARCH_TERMS.format(date)} ${MONTH.format(date)} ${SHORT.format(date)}`;
}
