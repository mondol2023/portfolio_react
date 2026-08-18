import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

import {
  VISITOR_COOKIE_MAX_AGE,
  VISITOR_DAY_COOKIE,
  VISITOR_ID_COOKIE,
} from "@/lib/analytics/cookies";
import { readClientIp, readGeoLocation } from "@/lib/analytics/geo";
import { utcDay } from "@/lib/analytics/period";
import { allowVisit } from "@/lib/analytics/rate-limit";
import { isBotUserAgent, parseBrowser, parseDevice, parseOs } from "@/lib/analytics/user-agent";
import { recordVisit } from "@/lib/firebase/repositories/analytics-repository";
import { SESSION_COOKIE_NAME } from "@/lib/firebase/session";
import { trackSchema } from "@/lib/validation/track-schema";

/**
 * Pageview beacon.
 *
 * The public pages are statically rendered, so a visit cannot be recorded
 * during their render — the browser posts here instead, which also lets it
 * supply screen size, timezone and language.
 *
 * The client IP is read only to derive a per-day salted hash used as the
 * rate-limit key. It is never written to Firestore, and neither is the hash.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noContent = () => new NextResponse(null, { status: 204 });

/** Salted and day-scoped, so the hash cannot be correlated across days. */
function rateLimitKey(ip: string, day: string): string {
  const salt = process.env.ANALYTICS_SALT ?? "portfolio-analytics";
  return createHash("sha256").update(`${salt}:${day}:${ip}`).digest("hex").slice(0, 32);
}

/** Path only: no query string, no fragment, no host. */
function cleanPath(value: string): string {
  const path = value.split(/[?#]/)[0] ?? "/";
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return normalised.length > 1 ? normalised.replace(/\/+$/, "") || "/" : "/";
}

/** Hostname only, and same-origin referrers count as direct. */
function cleanReferrer(value: string | undefined, origin: string): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.origin === origin) return "";
    return url.hostname.replace(/^www\./, "").slice(0, 100);
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Signed-in admins browsing their own site are not visitors.
  if (request.cookies.get(SESSION_COOKIE_NAME)) return noContent();

  const userAgent = request.headers.get("user-agent")?.trim() ?? "";
  if (isBotUserAgent(userAgent)) return noContent();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return noContent();
  }

  const parsed = trackSchema.safeParse(payload);
  if (!parsed.success) return noContent();

  const day = utcDay();
  if (!allowVisit(rateLimitKey(readClientIp(request.headers), day))) return noContent();

  const existingId = request.cookies.get(VISITOR_ID_COOKIE)?.value ?? "";
  const isNewVisitor = existingId === "";
  const visitorId = isNewVisitor ? crypto.randomUUID() : existingId;
  const isDailyUnique = request.cookies.get(VISITOR_DAY_COOKIE)?.value !== day;

  const geo = readGeoLocation(request.headers);
  const { path, referrer, screen, timezone, language } = parsed.data;

  try {
    await recordVisit({
      visitorId,
      path: cleanPath(path),
      referrer: cleanReferrer(referrer, request.nextUrl.origin),
      ...geo,
      // The browser's own timezone is better than the edge's guess.
      timezone: timezone || geo.timezone,
      browser: parseBrowser(userAgent),
      os: parseOs(userAgent),
      device: parseDevice(userAgent),
      language: language ?? "",
      screen: screen ?? "",
      day,
      isDailyUnique,
      isNewVisitor,
    });
  } catch (error) {
    console.error("[track] recordVisit failed", error);
  }

  const response = noContent();
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VISITOR_COOKIE_MAX_AGE,
  };
  response.cookies.set(VISITOR_ID_COOKIE, visitorId, options);
  response.cookies.set(VISITOR_DAY_COOKIE, day, options);
  return response;
}
