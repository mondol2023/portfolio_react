/**
 * Image hosts `next/image` is allowed to optimise.
 *
 * Single source of truth: `next.config.ts` turns this list into
 * `images.remotePatterns`, and the UI uses `isAllowedImageSrc` to decide
 * whether a stored URL can be rendered at all. Without that check a content
 * editor pasting a URL from an unlisted host would produce a runtime error on
 * a public page — instead the component quietly falls back to a placeholder.
 */

export const REMOTE_IMAGE_HOSTS = [
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "images.unsplash.com",
  "placehold.co",
  "raw.githubusercontent.com",
  "cdn.jsdelivr.net",
] as const;

/** True for a root-relative path, or an https URL on an allowed host. */
export function isAllowedImageSrc(src: string | undefined | null): src is string {
  if (!src) return false;
  if (src.startsWith("/")) return true;

  try {
    const url = new URL(src);
    return (
      url.protocol === "https:" && REMOTE_IMAGE_HOSTS.includes(url.hostname as never)
    );
  } catch {
    return false;
  }
}
