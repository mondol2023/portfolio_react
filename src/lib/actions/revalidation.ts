import "server-only";

import { revalidatePath } from "next/cache";

/**
 * Cache invalidation after admin writes.
 *
 * Public pages are statically rendered with `revalidate = 300`, which is right
 * for traffic but wrong for the person who just pressed Save — they expect to
 * see their edit immediately. These helpers purge the affected routes so the
 * next request re-renders from Firestore.
 *
 * Named per content type rather than exposing `revalidatePath` directly, so the
 * route list lives in one file instead of being repeated across six action
 * modules and drifting when a route is added.
 */

/** The single-page portfolio. Every section on it is CMS-driven. */
function revalidateHome(): void {
  revalidatePath("/");
}

export function revalidateProjects(slug?: string): void {
  revalidateHome();
  revalidatePath("/projects");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/projects/${slug}`);
}

/** Used when a slug changed: the old URL must stop resolving as well. */
export function revalidateProjectSlugs(...slugs: (string | undefined)[]): void {
  revalidateProjects();
  for (const slug of slugs) {
    if (slug) revalidatePath(`/projects/${slug}`);
  }
}

export function revalidateExperience(): void {
  revalidateHome();
}

export function revalidateSkills(): void {
  revalidateHome();
}

export function revalidateAbout(): void {
  revalidateHome();
}

/**
 * Pinned animations are mounted by the public shell, which wraps every site
 * route — but they change nothing about the content, so the OG image and the
 * sitemap are left alone.
 */
export function revalidateAnimations(): void {
  revalidateHome();
  revalidatePath("/projects");
  revalidatePath("/projects/[slug]", "page");
}

/**
 * The backdrop scene is mounted by the public shell, so it reaches every site
 * route — and like the animations it changes no content, so the OG image and
 * the sitemap are left alone.
 */
export function revalidateScenery(): void {
  revalidateAnimations();
}

/**
 * Settings feed the header, footer, metadata and the generated OG image, so
 * every public route is affected.
 */
export function revalidateSiteSettings(): void {
  revalidateHome();
  revalidatePath("/projects");
  revalidatePath("/projects/[slug]", "page");
  revalidatePath("/opengraph-image");
}
