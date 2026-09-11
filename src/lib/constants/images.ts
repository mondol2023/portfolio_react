// Relative, not `@/…`: `next.config.ts` imports this file at config-load time,
// outside the bundler, where the path alias does not exist.
import { REPO_IMAGERY_HOSTS } from "../../features/repo-imagery/hosts";

/**
 * Image hosts `next/image` is allowed to optimise.
 *
 * Single source of truth: `next.config.ts` turns this list into
 * `images.remotePatterns`, and the UI uses `isAllowedImageSrc` to decide
 * whether a stored URL can be rendered at all. Without that check a content
 * editor pasting a URL from an unlisted host would produce a runtime error on
 * a public page — instead the component quietly falls back to a placeholder.
 */

/** The hosts the site needs on its own, with no optional feature installed. */
const CORE_IMAGE_HOSTS = [
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "images.unsplash.com",
  "placehold.co",
  "raw.githubusercontent.com",
  "cdn.jsdelivr.net",
] as const;

/*
 * Feature hosts are merged in rather than pasted above, so removing the
 * repo-imagery folder is a one-line deletion here and the allow-list shrinks
 * back on its own. The `Set` is what keeps an overlap between the two lists
 * from producing a duplicate `remotePattern`.
 */
export const REMOTE_IMAGE_HOSTS: readonly string[] = [
  ...new Set<string>([...CORE_IMAGE_HOSTS, ...REPO_IMAGERY_HOSTS]),
];

/** True for a root-relative path, or an https URL on an allowed host. */
export function isAllowedImageSrc(src: string | undefined | null): src is string {
  if (!src) return false;
  if (src.startsWith("/")) return true;

  try {
    const url = new URL(src);
    return url.protocol === "https:" && REMOTE_IMAGE_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}
