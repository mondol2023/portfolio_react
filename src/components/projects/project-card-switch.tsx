"use client";

import { useSceneSceneryStore } from "@/lib/store/scene-scenery-store";
import type { Project } from "@/lib/types/content";

import { ProjectCard } from "./project-card";
import { PlansheetCard } from "./variants/plansheet-card";

interface ProjectCardSwitchProps {
  project: Project;
  emphasis?: boolean;
  priority?: boolean;
  className?: string;
}

/**
 * Picks Projects' DOM card off the active scenery, kept out of
 * `sections/projects.tsx` so that section stays a server component. Every
 * scenery but `blueprint` keeps the photographic tilt card; `blueprint`
 * switches to the dashed drafting sheet in `variants/plansheet-card.tsx`,
 * which has no image to prioritise.
 *
 * Reads `renderScenery.id`, not the picker's committed `id` — see the same
 * note on `skills-variant-switch.tsx` (Phase K).
 */
export function ProjectCardSwitch({ project, emphasis, priority, className }: ProjectCardSwitchProps) {
  const sceneryId = useSceneSceneryStore((state) => state.renderScenery.id);
  return sceneryId === "blueprint" ? (
    <PlansheetCard project={project} emphasis={emphasis} className={className} />
  ) : (
    <ProjectCard project={project} emphasis={emphasis} priority={priority} className={className} />
  );
}
