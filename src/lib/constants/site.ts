/**
 * Deployment-level constants.
 *
 * The canonical origin has to be known at build time for `metadataBase`,
 * sitemap and robots output, so it comes from an environment variable rather
 * than the Firestore settings document.
 */

const FALLBACK_URL = "http://localhost:3000";

/**
 * Absolute origin of the deployment, without a trailing slash.
 *
 * `NEXT_PUBLIC_SITE_URL` is deliberately public: it is a URL, not a secret, and
 * client components building share links need it too.
 */
export function getSiteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined);

  if (!configured) return FALLBACK_URL;

  const withProtocol = /^https?:\/\//.test(configured) ? configured : `https://${configured}`;
  return withProtocol.replace(/\/$/, "");
}

/** Builds an absolute URL from a root-relative path. */
export function absoluteUrl(path = "/"): string {
  return `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Path to the generated Open Graph image for a given route. */
export const OG_IMAGE_PATH = "/opengraph-image";
