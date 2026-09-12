"use client";

import { useSceneContentStore } from "@/lib/store/scene-content-store";

import { ProjectPanels } from "../objects/project-panels";
import { sceneSectionProgress } from "../scene/camera-rig";

interface ProjectsSceneProps {
  tone: string;
  toneSoft: string;
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
export function ProjectsScene({ tone, toneSoft, reducedMotion, progress, pointer }: ProjectsSceneProps) {
  const projects = useSceneContentStore((state) => state.projects);
  // Index 3 (Experience → Projects) is this section's own entrance span;
  // index 4 (Projects → Contact) is its exit.
  const entryProgress = sceneSectionProgress(progress, 3);
  const exitProgress = sceneSectionProgress(progress, 4);

  if (projects.length === 0) return null;

  return (
    <ProjectPanels
      projects={projects}
      tone={tone}
      toneSoft={toneSoft}
      reducedMotion={reducedMotion}
      pointer={pointer}
      entryProgress={entryProgress}
      exitProgress={exitProgress}
    />
  );
}
