import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";

import { getAdminAuth, getAdminDb, requireAdminAuth, requireAdminDb } from "./admin";

/**
 * Admin session handling.
 *
 * Authorization is deliberately *two-factor at the data level*: a user counts as
 * an administrator only when BOTH hold:
 *
 *   1. their Firebase Auth token carries the custom claim `admin: true`, and
 *   2. a document exists at `admins/{uid}` in Firestore.
 *
 * A signed-in user is not an administrator. `if (user)` is never sufficient.
 * The claim is what Firestore security rules check (they are the independent
 * backstop, enforced even if this code were bypassed); the allowlist document
 * is what lets access be revoked instantly without minting new tokens.
 *
 * The session itself is a Firebase session cookie: httpOnly, so client-side
 * JavaScript can neither read it nor forge one.
 */

export const SESSION_COOKIE_NAME = "__session";

/** Firebase caps session cookies at 14 days. */
const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export interface AdminUser {
  uid: string;
  email: string | null;
  name: string | null;
}

/** Thrown when a signed-in user exists but is not on the admin allowlist. */
export class NotAuthorizedError extends Error {
  constructor(message = "This account is not authorized for admin access.") {
    super(message);
    this.name = "NotAuthorizedError";
  }
}

async function isOnAdminAllowlist(uid: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return false;
  const snapshot = await db.collection("admins").doc(uid).get();
  return snapshot.exists;
}

/**
 * Exchanges a freshly minted ID token for a session cookie value.
 *
 * Rejects the exchange unless the account passes the full admin check, so an
 * ordinary Firebase user cannot obtain an admin session at all. Returns the
 * verified uid alongside the cookie so callers never have to trust a uid sent
 * by the client.
 */
export async function createSessionCookie(
  idToken: string,
): Promise<{ cookie: string; uid: string }> {
  const auth = requireAdminAuth();
  // `checkRevoked: true` — a disabled or signed-out-everywhere account must not
  // be able to trade a stale token for a two-week session.
  const decoded = await auth.verifyIdToken(idToken, true);

  const hasClaim = decoded.admin === true;
  const onAllowlist = await isOnAdminAllowlist(decoded.uid);
  if (!hasClaim || !onAllowlist) {
    throw new NotAuthorizedError();
  }

  const cookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });

  return { cookie, uid: decoded.uid };
}

export async function setSessionCookie(value: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

/**
 * Resolves the current administrator, or `null` for anonymous visitors, signed
 * in non-admins, and expired or revoked sessions.
 *
 * Wrapped in `cache()` so a layout, a page and a Server Action in the same
 * request share one verification round-trip.
 */
export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  const auth = getAdminAuth();
  if (!auth) return null;

  const store = await cookies();
  const session = store.get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;

  try {
    const decoded = await auth.verifySessionCookie(session, true);
    if (decoded.admin !== true) return null;
    if (!(await isOnAdminAllowlist(decoded.uid))) return null;

    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: typeof decoded.name === "string" ? decoded.name : null,
    };
  } catch {
    // Expired, revoked or tampered-with cookie — treat as signed out.
    return null;
  }
});

/**
 * Asserts admin access. Every admin page and every mutating Server Action calls
 * this; authorization is re-verified server-side on each request rather than
 * being inherited from whatever the client claims.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new NotAuthorizedError("Admin authentication required.");
  return admin;
}

/**
 * Records the last sign-in for the dashboard. Best-effort: a failure here must
 * never block a legitimate login.
 */
export async function touchAdminLastLogin(uid: string): Promise<void> {
  try {
    await requireAdminDb()
      .collection("admins")
      .doc(uid)
      .set({ lastLoginAt: new Date() }, { merge: true });
  } catch {
    // Intentionally ignored.
  }
}
