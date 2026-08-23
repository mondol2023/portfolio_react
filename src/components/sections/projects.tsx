import { FolderOpen } from "lucide-react";

import { Arcade } from "@/components/experience/arcade/arcade";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/demo-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeading } from "@/components/ui/section-heading";
import { hasDemoContent } from "@/lib/constants/demo-content";
import type { Project } from "@/lib/types/content";
import type { TechIconMap } from "@/lib/utils/tech-icons";

import { Section, headingId } from "./section";

/**
 * Projects — "PROJECT ARCADE".
 *
 * The featured set as game cartridges rather than a photo grid: click one and
 * it grows into an animated browser preview while the rest step back. All of
 * that interactive state lives in the client-only `Arcade`; this stays a
 * server component so the empty/demo states below render without shipping
 * any of it when there's nothing to show.
 */

const SECTION_ID = "projects";
const HOME_LIMIT = 5;

interface ProjectsProps {
  projects: Project[];
  /** Total published count — decides whether the archive link is worth showing. */
  totalCount: number;
  techIcons: TechIconMap;
}

export function Projects({ projects, totalCount, techIcons }: ProjectsProps) {
  const visible = projects.slice(0, HOME_LIMIT);

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

      {visible.length === 0 ? (
        <Reveal className="mt-12">
          <EmptyState
            icon={FolderOpen}
            title="No published projects yet"
            description="Projects published from the admin panel appear here as playable cartridges."
          />
        </Reveal>
      ) : (
        <Arcade projects={visible} techIcons={techIcons} />
      )}
    </Section>
  );
}
