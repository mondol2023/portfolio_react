/**
 * Firestore collection and document paths, in one place so a rename touches a
 * single file — and so `firestore.rules` and the repositories can be read
 * side by side.
 */
export const COLLECTIONS = {
  projects: "projects",
  experience: "experience",
  skills: "skills",
  messages: "messages",
  admins: "admins",
  content: "content",
  /** One document per recorded pageview. */
  visits: "visits",
  /** Pre-aggregated rollups: one document per UTC day, plus `_totals`. */
  visitStats: "visitStats",
} as const;

/** All-time counters, kept out of the day-keyed documents. */
export const VISIT_TOTALS_DOC = "_totals";

/** Singleton documents inside the `content` collection. */
export const CONTENT_DOCS = {
  about: "about",
  siteSettings: "siteSettings",
  /** Which surprise animations are pinned on for every visitor. */
  animations: "animations",
} as const;
