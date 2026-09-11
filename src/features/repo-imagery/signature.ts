import "server-only";

import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signing cover URLs.
 *
 * The cover route renders arbitrary text as a PNG on this site's own domain.
 * Unsigned, that is a small abuse surface: anyone could hotlink
 * `/api/repo-imagery/cover?t=…` and have this server render their words under
 * this domain's name. A signature makes the route render only URLs this server
 * produced.
 *
 * The secret defaults to a constant so the feature works with nothing
 * configured. That default is published in this repository, so until
 * `REPO_IMAGERY_SECRET` is set the signature is forgeable and the protection is
 * nominal. Setting it later invalidates cover URLs already stored on projects —
 * they will 403 until the covers are re-picked.
 */

const FALLBACK_SECRET = "repo-imagery-unconfigured";

function secret(): string {
  const value = process.env.REPO_IMAGERY_SECRET?.trim();
  return value && value !== "" ? value : FALLBACK_SECRET;
}

/**
 * The bytes that get signed.
 *
 * Sorted, and with `sig` itself excluded, so that a URL surviving a round trip
 * through a form field — where key order is not guaranteed — still verifies.
 */
function canonical(query: URLSearchParams): string {
  const pairs: string[] = [];

  for (const [key, value] of query) {
    if (key === "sig") continue;
    pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }

  return pairs.sort().join("&");
}

export function signQuery(query: URLSearchParams): string {
  return createHmac("sha256", secret()).update(canonical(query)).digest("hex");
}

/** Whether `query` carries a `sig` this server would have produced. */
export function verifyQuery(query: URLSearchParams): boolean {
  const provided = query.get("sig");
  if (!provided) return false;

  const expected = signQuery(query);
  // `timingSafeEqual` throws on a length mismatch, which a hand-typed `sig`
  // will always be, so the lengths are compared first.
  if (provided.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));
}

/** A signed cover URL, root-relative — which `isAllowedImageSrc` accepts as-is. */
export function signedCoverPath(query: URLSearchParams): string {
  const signed = new URLSearchParams(query);
  signed.set("sig", signQuery(query));
  return `/api/repo-imagery/cover?${signed.toString()}`;
}
