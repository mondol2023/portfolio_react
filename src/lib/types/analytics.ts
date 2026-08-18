import type { ContactMessage } from "./content";

/**
 * Visitor analytics.
 *
 * Two shapes: `Visit` is one recorded pageview, `VisitorAnalytics` is the
 * pre-aggregated rollup the dashboard charts read so they never scan the log.
 */

export const DEVICE_TYPES = ["desktop", "mobile", "tablet", "unknown"] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];

export interface Visit {
  id: string;
  /** Random first-party cookie id. Not derived from any network identifier. */
  visitorId: string;
  path: string;
  referrer: string;
  /** ISO-3166 alpha-2, or "" when the host sent no geo header. */
  country: string;
  countryName: string;
  region: string;
  city: string;
  timezone: string;
  browser: string;
  os: string;
  device: DeviceType;
  language: string;
  screen: string;
  /** UTC calendar day, `YYYY-MM-DD`. */
  day: string;
  createdAt: string;
}

/** A visit joined to any contact messages the same visitor sent. */
export interface VisitRow extends Visit {
  messages: ContactMessage[];
}

export interface DailyVisitStat {
  day: string;
  visits: number;
  uniques: number;
}

export interface VisitBreakdown {
  label: string;
  value: number;
}

export interface VisitorAnalytics {
  totalVisits: number;
  totalUniques: number;
  visitsToday: number;
  uniquesToday: number;
  visitsWindow: number;
  uniquesWindow: number;
  /** Oldest first, gaps filled with zeros so the trend line does not lie. */
  daily: DailyVisitStat[];
  countries: VisitBreakdown[];
  devices: VisitBreakdown[];
  browsers: VisitBreakdown[];
  operatingSystems: VisitBreakdown[];
  pages: VisitBreakdown[];
  referrers: VisitBreakdown[];
}

export const EMPTY_ANALYTICS: VisitorAnalytics = {
  totalVisits: 0,
  totalUniques: 0,
  visitsToday: 0,
  uniquesToday: 0,
  visitsWindow: 0,
  uniquesWindow: 0,
  daily: [],
  countries: [],
  devices: [],
  browsers: [],
  operatingSystems: [],
  pages: [],
  referrers: [],
};
