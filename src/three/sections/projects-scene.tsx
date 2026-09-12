"use client";

import type { SceneBudget } from "@/lib/experience/device-tier";
import type { ScenePalette } from "@/lib/experience/scene-palette";
import { useSceneContentStore } from "@/lib/store/scene-content-store";

import { ProjectPanels } from "../objects/project-panels";
import { sceneSectionEnvelope } from "../scene/camera-rig";

interface ProjectsSceneProps {
  palette: ScenePalette;
  budget: SceneBudget;
  reducedMotion: boolean;
  progress: number;
  pointer: { current: { x: number; y: number } };
}

/**
 * Projects' slice of the persistent canvas. Reads real project data pushed in
 * by `ProjectsSceneBridge` (mounted inside the DOM `Projects` section itself)
 * via `scene-content-store` rather than fetching or duplicating it — nothing
 * renders until that hand-off has happened at least once.
 */
export function ProjectsScene({ palette, budget, reducedMotion, progress, pointer }: ProjectsSceneProps) {
  const projects = useSceneContentStore((state) => state.projects);
  // Waypoint index 3 — Projects is the fourth section in DOM order, so the
  // entrance runs across Skills → Projects and the exit across Projects →
  // Experience, with a dwell between the two.
  const { entry, exit } = sceneSectionEnvelope(progress, 3);

  if (projects.length === 0) return null;

  return (
    <ProjectPanels
      projects={projects}
      palette={palette}
      budget={budget}
      reducedMotion={reducedMotion}
      pointer={pointer}
      entryProgress={entry}
      exitProgress={exit}
    />
  );
}
