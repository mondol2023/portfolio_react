import "server-only";

/**
 * Best-effort flood guard for the tracking endpoint.
 *
 * In-process and therefore per-instance — a serverless deployment can run
 * several at once, so this blunts naive spam rather than enforcing a quota. It
 * is keyed by the salted daily IP hash, which is the only thing we ever derive
 * from an address and is never persisted.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;
/** Bounds memory if a single instance sees a very large number of keys. */
const MAX_KEYS = 5_000;

const hits = new Map<string, { count: number; resetAt: number }>();

export function allowVisit(key: string, now = Date.now()): boolean {
  const entry = hits.get(key);

  if (!entry || now >= entry.resetAt) {
    if (hits.size >= MAX_KEYS) hits.clear();
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  entry.count += 1;
  return entry.count <= MAX_PER_WINDOW;
}
