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
} as const;

/** Singleton documents inside the `content` collection. */
export const CONTENT_DOCS = {
  about: "about",
  siteSettings: "siteSettings",
} as const;
