"use client";

import type { SceneBudget } from "@/lib/experience/device-tier";
import type { ScenePalette } from "@/lib/experience/scene-palette";
import type { SceneryDefinition } from "@/lib/experience/scenery";
import { useSceneContentStore } from "@/lib/store/scene-content-store";

import { ProjectsVariant } from "../objects/projects";

interface ProjectsSceneProps {
  palette: ScenePalette;
  budget: SceneBudget;
  reducedMotion: boolean;
  pointer: { current: { x: number; y: number } };
  scenery: SceneryDefinition;
}

/**
 * Projects' slice of the persistent canvas. Reads real project data pushed in
 * by `ProjectsSceneBridge` (mounted inside the DOM `Projects` section itself)
 * via `scene-content-store` rather than fetching or duplicating it — nothing
 * renders until that hand-off has happened at least once.
 */
export function ProjectsScene({ palette, budget, reducedMotion, pointer, scenery }: ProjectsSceneProps) {
  const projects = useSceneContentStore((state) => state.projects);

  if (projects.length === 0) return null;

  return (
    <ProjectsVariant
      projects={projects}
      palette={palette}
      budget={budget}
      reducedMotion={reducedMotion}
      pointer={pointer}
      // Waypoint index 3 — Projects is the fourth section in DOM order, so the
      // entrance runs across Skills → Projects and the exit across Projects →
      // Experience, with a dwell between the two.
      sectionIndex={3}
      scenery={scenery}
    />
  );
}
