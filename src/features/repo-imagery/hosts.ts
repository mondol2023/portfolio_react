/**
 * The image hosts this feature needs `next/image` to accept.
 *
 * Kept in the feature folder, and spread into `lib/constants/images.ts` by a
 * single import there, so removing the feature is removing the folder and that
 * one line — the allow-list shrinks back to what the rest of the site uses.
 *
 * Deliberately dependency-free: `next.config.ts` imports the file that imports
 * this one, at config-load time, outside the bundler and outside the `@/` alias.
 *
 * Already on the core list and therefore not repeated here:
 * `raw.githubusercontent.com` (README images committed to the repo) and
 * `images.unsplash.com` (every Unsplash photo URL).
 */

export const REPO_IMAGERY_HOSTS = [
  /** GitHub's own rendered repository card — the zero-configuration cover. */
  "opengraph.githubassets.com",
  /** Images pasted into an issue or README before the 2024 rename. */
  "user-images.githubusercontent.com",
  /** GitHub's image proxy: what an external `<img>` in a README becomes. */
  "camo.githubusercontent.com",
  /** Owner and organisation avatars. */
  "avatars.githubusercontent.com",
  /**
   * `github.com/user-attachments/assets/…` — where a dragged-in README image
   * has lived since 2024. It answers with a redirect to a signed URL on another
   * host; the optimiser follows it, and only this first URL is matched against
   * the allow-list, which is why the host has to be listed whole.
   */
  "github.com",
] as const;
