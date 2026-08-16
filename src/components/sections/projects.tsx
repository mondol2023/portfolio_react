import { FolderOpen } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { ProjectCard } from "@/components/projects/project-card";
import { ButtonLink } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/demo-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { hasDemoContent } from "@/lib/constants/demo-content";
import type { Project } from "@/lib/types/content";

import { Section, headingId } from "./section";

/**
 * Selected work.
 *
 * Shows the featured set on the home page and links to the full archive; the
 * first card gets a wider treatment so the grid reads as a curated selection
 * rather than a uniform list.
 */

const SECTION_ID = "projects";
const HOME_LIMIT = 5;

interface ProjectsProps {
  projects: Project[];
  /** Total published count — decides whether the archive link is worth showing. */
  totalCount: number;
}

export function Projects({ projects, totalCount }: ProjectsProps) {
  const visible = projects.slice(0, HOME_LIMIT);
  const [lead, ...rest] = visible;

  return (
    <Section id={SECTION_ID} tone="work">
      <SectionHeading
        id={headingId(SECTION_ID)}
        eyebrow="03 — Work"
        title="Selected projects"
        description="A few things worth talking through — what the problem was, what I built, and what I would do differently."
        note={hasDemoContent(visible) ? <DemoBadge label="Sample projects" /> : null}
        action={
          totalCount > visible.length ? (
            <ButtonLink href="/projects" variant="secondary">
              All projects ({totalCount})
            </ButtonLink>
          ) : null
        }
      />

      {!lead ? (
        <Reveal className="mt-12">
          <EmptyState
            icon={FolderOpen}
            title="No published projects yet"
            description="Projects published from the admin panel appear here as case studies."
          />
        </Reveal>
      ) : (
        <Stagger as="ul" step={0.06} className="mt-16 grid gap-6 lg:grid-cols-3">
          <StaggerItem as="li" className="lg:col-span-2">
            <ProjectCard project={lead} emphasis priority className="h-full" />
          </StaggerItem>

          {rest.map((project) => (
            <StaggerItem as="li" key={project.id}>
              <ProjectCard project={project} className="h-full" />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </Section>
  );
}
