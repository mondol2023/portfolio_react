import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";

import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectCard } from "@/components/projects/project-card";
import { DemoBadge } from "@/components/ui/demo-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { hasDemoContent } from "@/lib/constants/demo-content";
import { getPublishedProjects } from "@/lib/firebase/repositories/projects-repository";

/**
 * Project archive.
 *
 * The home page shows a curated subset; this is the complete published list, in
 * the same order, with no featured/non-featured distinction — once someone has
 * clicked through to "all work" the ranking has done its job.
 */

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Selected engineering work — case studies covering the problem, the approach and what shipped.",
  alternates: { canonical: "/projects" },
};

export default async function ProjectsPage() {
  const projects = await getPublishedProjects();

  return (
    <>
      <PageHeader
        tone="work"
        eyebrow="Archive"
        title="Projects"
        description="Case studies of things I've designed, built and shipped. Each one covers the problem, the approach and what actually came out of it."
        meta={projects.length > 0 ? `${projects.length} published` : undefined}
      >
        {hasDemoContent(projects) ? <DemoBadge label="Sample projects" /> : null}
      </PageHeader>

      <div className="container-page pb-24 sm:pb-32">
        {projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No projects published yet"
            description="Case studies will appear here once they're published."
          />
        ) : (
          <Stagger as="ul" step={0.05} className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project, index) => (
              <StaggerItem as="li" key={project.id} className="flex">
                <ProjectCard project={project} priority={index < 3} className="w-full" />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </>
  );
}
