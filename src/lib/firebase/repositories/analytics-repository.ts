import "server-only";

import { cache } from "react";
import { FieldValue, type DocumentData, type DocumentSnapshot } from "firebase-admin/firestore";

import { listDays, utcDay } from "@/lib/analytics/period";
import { countryName } from "@/lib/analytics/geo";
import {
  DEVICE_TYPES,
  EMPTY_ANALYTICS,
  type DailyVisitStat,
  type DeviceType,
  type Visit,
  type VisitBreakdown,
  type VisitorAnalytics,
} from "@/lib/types/analytics";

import { getAdminDb } from "../admin";
import { COLLECTIONS, VISIT_TOTALS_DOC } from "../collections";
import { readEnum, readIsoDate, readNestedObject, readNumber, readString } from "../converters";

/**
 * Visitor analytics.
 *
 * Two collections, because the two questions have very different shapes.
 * `visits` is an append-only event log — the searchable table reads a bounded
 * window of it. `visitStats` holds one rollup document per UTC day, updated
 * with `FieldValue.increment`, so the charts cost about thirty document reads
 * regardless of how much traffic the site has ever seen.
 *
 * No IP address is stored in either. See `src/app/api/track/route.ts`.
 */

/** Days of history the trend chart and the breakdowns cover. */
export const TREND_DAYS = 30;

/** How much of the event log the search scans. */
export const VISIT_SCAN_LIMIT = 500;

const BREAKDOWN_LIMIT = 8;

export interface RecordVisitInput {
  visitorId: string;
  path: string;
  referrer: string;
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
  day: string;
  /** First visit from this browser today — increments the daily unique count. */
  isDailyUnique: boolean;
  /** First visit from this browser ever — increments the all-time unique count. */
  isNewVisitor: boolean;
}

/**
 * Firestore map keys may not be empty or start with `__`, and an unbounded key
 * would let a crafted request grow the rollup document without limit.
 */
function statKey(value: string): string {
  const trimmed = value.trim().slice(0, 100);
  if (trimmed === "" || trimmed.startsWith("__")) return "Unknown";
  return trimmed;
}

function toVisit(snapshot: DocumentSnapshot): Visit | null {
  const data = snapshot.data();
  if (!data) return null;

  const country = readString(data, "country");
  return {
    id: snapshot.id,
    visitorId: readString(data, "visitorId"),
    path: readString(data, "path", "/"),
    referrer: readString(data, "referrer"),
    country,
    countryName: readString(data, "countryName") || countryName(country),
    region: readString(data, "region"),
    city: readString(data, "city"),
    timezone: readString(data, "timezone"),
    browser: readString(data, "browser", "Unknown"),
    os: readString(data, "os", "Unknown"),
    device: readEnum<DeviceType>(data, "device", DEVICE_TYPES, "unknown"),
    language: readString(data, "language"),
    screen: readString(data, "screen"),
    day: readString(data, "day"),
    createdAt: readIsoDate(data, "createdAt"),
  };
}

/**
 * Writes the event and both rollups in one batch, so a partial failure cannot
 * leave the counters disagreeing with the log.
 */
export async function recordVisit(input: RecordVisitInput): Promise<void> {
  const db = getAdminDb();
  if (!db) return;

  const batch = db.batch();

  batch.set(db.collection(COLLECTIONS.visits).doc(), {
    visitorId: input.visitorId,
    path: input.path,
    referrer: input.referrer,
    country: input.country,
    countryName: input.countryName,
    region: input.region,
    city: input.city,
    timezone: input.timezone,
    browser: input.browser,
    os: input.os,
    device: input.device,
    language: input.language,
    screen: input.screen,
    day: input.day,
    createdAt: FieldValue.serverTimestamp(),
  });

  // `merge: true` deep-merges the nested maps, so each key increments on its
  // own without us ever reading the document back.
  batch.set(
    db.collection(COLLECTIONS.visitStats).doc(input.day),
    {
      day: input.day,
      visits: FieldValue.increment(1),
      uniques: FieldValue.increment(input.isDailyUnique ? 1 : 0),
      countries: { [statKey(input.countryName || input.country)]: FieldValue.increment(1) },
      devices: { [statKey(input.device)]: FieldValue.increment(1) },
      browsers: { [statKey(input.browser)]: FieldValue.increment(1) },
      operatingSystems: { [statKey(input.os)]: FieldValue.increment(1) },
      pages: { [statKey(input.path)]: FieldValue.increment(1) },
      referrers: { [statKey(input.referrer || "Direct")]: FieldValue.increment(1) },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  batch.set(
    db.collection(COLLECTIONS.visitStats).doc(VISIT_TOTALS_DOC),
    {
      visits: FieldValue.increment(1),
      uniques: FieldValue.increment(input.isNewVisitor ? 1 : 0),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
}

function mergeCounts(target: Map<string, number>, source: DocumentData): void {
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "number") target.set(key, (target.get(key) ?? 0) + value);
  }
}

function toBreakdown(counts: Map<string, number>, limit = BREAKDOWN_LIMIT): VisitBreakdown[] {
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/** Counters and chart series. Reads the rollups only — never the event log. */
export const getVisitorAnalytics = cache(async (): Promise<VisitorAnalytics> => {
  const db = getAdminDb();
  if (!db) return EMPTY_ANALYTICS;

  try {
    const stats = db.collection(COLLECTIONS.visitStats);
    const [totalsSnapshot, dailySnapshot] = await Promise.all([
      stats.doc(VISIT_TOTALS_DOC).get(),
      // `_totals` carries no `day` field, so the index excludes it here.
      stats.orderBy("day", "desc").limit(TREND_DAYS).get(),
    ]);

    const byDay = new Map<string, DocumentData>();
    for (const doc of dailySnapshot.docs) byDay.set(doc.id, doc.data());

    const countries = new Map<string, number>();
    const devices = new Map<string, number>();
    const browsers = new Map<string, number>();
    const operatingSystems = new Map<string, number>();
    const pages = new Map<string, number>();
    const referrers = new Map<string, number>();

    const today = utcDay();
    const daily: DailyVisitStat[] = listDays(today, TREND_DAYS).map((day) => {
      const data = byDay.get(day);
      if (!data) return { day, visits: 0, uniques: 0 };

      mergeCounts(countries, readNestedObject(data, "countries"));
      mergeCounts(devices, readNestedObject(data, "devices"));
      mergeCounts(browsers, readNestedObject(data, "browsers"));
      mergeCounts(operatingSystems, readNestedObject(data, "operatingSystems"));
      mergeCounts(pages, readNestedObject(data, "pages"));
      mergeCounts(referrers, readNestedObject(data, "referrers"));

      return {
        day,
        visits: readNumber(data, "visits"),
        uniques: readNumber(data, "uniques"),
      };
    });

    const totals = totalsSnapshot.data() ?? {};
    const todayStat = daily.find((entry) => entry.day === today);

    return {
      totalVisits: readNumber(totals, "visits"),
      totalUniques: readNumber(totals, "uniques"),
      visitsToday: todayStat?.visits ?? 0,
      uniquesToday: todayStat?.uniques ?? 0,
      visitsWindow: daily.reduce((sum, entry) => sum + entry.visits, 0),
      uniquesWindow: daily.reduce((sum, entry) => sum + entry.uniques, 0),
      daily,
      countries: toBreakdown(countries),
      devices: toBreakdown(devices),
      browsers: toBreakdown(browsers),
      operatingSystems: toBreakdown(operatingSystems),
      pages: toBreakdown(pages),
      referrers: toBreakdown(referrers),
    };
  } catch (error) {
    console.error("[analytics] getVisitorAnalytics failed", error);
    return EMPTY_ANALYTICS;
  }
});

/** The window the search scans, newest first. */
export const getRecentVisits = cache(async (limit = VISIT_SCAN_LIMIT): Promise<Visit[]> => {
  const db = getAdminDb();
  if (!db) return [];

  try {
    const snapshot = await db
      .collection(COLLECTIONS.visits)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map(toVisit).filter((visit): visit is Visit => visit !== null);
  } catch (error) {
    console.error("[analytics] getRecentVisits failed", error);
    return [];
  }
});
