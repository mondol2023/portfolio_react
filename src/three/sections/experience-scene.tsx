"use client";

import type { SceneBudget } from "@/lib/experience/device-tier";
import type { ScenePalette } from "@/lib/experience/scene-palette";
import { useSceneContentStore } from "@/lib/store/scene-content-store";

import { ExperienceTimeline } from "../objects/experience-timeline";

interface ExperienceSceneProps {
  palette: ScenePalette;
  budget: SceneBudget;
  reducedMotion: boolean;
}

/**
 * Experience's slice of the persistent canvas. Reads real experience data
 * pushed in by `ExperienceSceneBridge` (mounted inside the DOM `Experience`
 * section itself) via `scene-content-store`.
 *
 * Takes the whole palette and budget rather than two tone strings, the same
 * shape `ProjectsScene` uses: since Phase 17 the section is a corridor with a
 * depth rake and a tier-scaled station count, and both need more than an
 * accent.
 */
export function ExperienceScene({ palette, budget, reducedMotion }: ExperienceSceneProps) {
  const experiences = useSceneContentStore((state) => state.experiences);

  if (experiences.length === 0) return null;

  return (
    <ExperienceTimeline
      experiences={experiences}
      palette={palette}
      budget={budget}
      reducedMotion={reducedMotion}
      // Waypoint index 4 — Experience is the fifth section in DOM order, so
      // Projects → Experience is the entrance span and Experience → Contact
      // the exit, with a dwell between the two.
      sectionIndex={4}
    />
  );
}
