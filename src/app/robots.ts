import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/constants/site";

/**
 * Robots policy.
 *
 * The admin area is disallowed for tidiness, not for security — robots.txt is
 * advisory and publicly readable. The actual protection is the session check in
 * the admin layout and the Firestore rules; this only keeps the CMS out of
 * search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
