import type { VisitRow } from "@/lib/types/analytics";

import { dateSearchText } from "./period";

/**
 * Visit search.
 *
 * Firestore has no full-text index, so the dashboard scans a bounded window of
 * recent visits and matches in memory. That is the right trade at portfolio
 * scale: no search service, no denormalised token arrays, and every field is
 * searchable including ones derived at read time (country names, month names,
 * the sender of a linked message).
 */

export const VISIT_SEARCH_FIELDS = [
  { value: "all", label: "All fields" },
  { value: "visitor", label: "Visitor & messages" },
  { value: "location", label: "Location" },
  { value: "page", label: "Page" },
  { value: "device", label: "Device" },
  { value: "browser", label: "Browser & OS" },
  { value: "referrer", label: "Referrer" },
  { value: "date", label: "Date & month" },
] as const;

export type VisitSearchField = (typeof VISIT_SEARCH_FIELDS)[number]["value"];

export const DEFAULT_SEARCH_FIELD: VisitSearchField = "all";

export function parseSearchField(value: unknown): VisitSearchField {
  return VISIT_SEARCH_FIELDS.some((field) => field.value === value)
    ? (value as VisitSearchField)
    : DEFAULT_SEARCH_FIELD;
}

function visitorText(row: VisitRow): string {
  return [
    row.visitorId,
    ...row.messages.flatMap((message) => [
      message.name,
      message.email,
      message.subject,
      message.message,
    ]),
  ].join(" ");
}

function fieldText(row: VisitRow, field: VisitSearchField): string {
  switch (field) {
    case "visitor":
      return visitorText(row);
    case "location":
      return [row.city, row.region, row.countryName, row.country, row.timezone].join(" ");
    case "page":
      return row.path;
    case "device":
      return `${row.device} ${row.screen}`;
    case "browser":
      return `${row.browser} ${row.os}`;
    case "referrer":
      return row.referrer || "direct";
    case "date":
      return dateSearchText(row.createdAt);
    case "all":
      return [
        visitorText(row),
        row.path,
        row.city,
        row.region,
        row.countryName,
        row.country,
        row.timezone,
        row.browser,
        row.os,
        row.device,
        row.screen,
        row.language,
        row.referrer || "direct",
        dateSearchText(row.createdAt),
      ].join(" ");
  }
}

/** All terms must appear somewhere in the chosen field. */
export function matchesVisit(row: VisitRow, query: string, field: VisitSearchField): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = fieldText(row, field).toLowerCase();
  return terms.every((term) => haystack.includes(term));
}
