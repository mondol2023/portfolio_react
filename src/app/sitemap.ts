import type { MetadataRoute } from "next";

import { isDemoId } from "@/lib/constants/demo-content";
import { absoluteUrl } from "@/lib/constants/site";
import { getPublishedProjects } from "@/lib/firebase/repositories/projects-repository";

/**
 * Sitemap.
 *
 * Only published projects appear — a draft is not a public URL, and neither is a
 * demo case study: those render so the site is reviewable before real content
 * exists, but submitting them to a crawler would be asking for placeholder pages
 * in the index. They are `noindex` at the page level too. Regenerated hourly
 * rather than per request so a crawler cannot make Firestore reads a cost centre.
 */

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = (await getPublishedProjects()).filter(
    (project) => !isDemoId(project.id),
  );
  const now = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: absoluteUrl("/projects"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...projects.map((project) => ({
      url: absoluteUrl(`/projects/${project.slug}`),
      lastModified: project.updatedAt ? new Date(project.updatedAt) : now,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
  ];
}
