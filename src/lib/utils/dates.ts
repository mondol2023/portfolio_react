/**
 * Date helpers. Everything the app stores is an ISO date string, so these are
 * pure string → string transforms with no timezone surprises: dates are parsed
 * as UTC and formatted with an explicit UTC timezone, which keeps the server
 * render and the client hydration identical.
 */

const MONTH_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const FULL_DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function parse(iso: string): Date | null {
  if (!iso) return null;
  // Bare `YYYY-MM-DD` is already parsed as UTC by spec; anything else we
  // normalise by appending a UTC midnight.
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMonthYear(iso: string | undefined): string {
  const date = iso ? parse(iso) : null;
  return date ? MONTH_YEAR.format(date) : "";
}

export function formatFullDate(iso: string | undefined): string {
  const date = iso ? parse(iso) : null;
  return date ? FULL_DATE.format(date) : "";
}

/** "Jan 2023 — Present" style range used by the timeline and project meta. */
export function formatDateRange(
  startDate: string,
  endDate: string | undefined,
  { presentLabel = "Present" }: { presentLabel?: string } = {},
): string {
  const start = formatMonthYear(startDate);
  const end = endDate ? formatMonthYear(endDate) : presentLabel;
  if (!start) return end;
  return `${start} — ${end}`;
}

/** Human duration between two dates, e.g. "1 yr 4 mos". */
export function formatDuration(startDate: string, endDate?: string): string {
  const start = parse(startDate);
  const end = endDate ? parse(endDate) : new Date();
  if (!start || !end || end < start) return "";

  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth()) +
    1;
  const years = Math.floor(months / 12);
  const remainder = months % 12;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
  if (remainder > 0) parts.push(`${remainder} mo${remainder > 1 ? "s" : ""}`);
  return parts.join(" ") || "1 mo";
}

/** Year or year range used as project metadata, e.g. "2024" / "2023–2024". */
export function formatYearRange(startDate: string, endDate?: string): string {
  const start = parse(startDate);
  if (!start) return "";
  const startYear = start.getUTCFullYear();
  const end = endDate ? parse(endDate) : null;
  const endYear = end?.getUTCFullYear();
  if (!endYear || endYear === startYear) return String(startYear);
  return `${startYear}–${endYear}`;
}

/** `datetime` attribute value for <time> elements. */
export function toDateTimeAttribute(iso: string): string {
  return iso.slice(0, 10);
}
