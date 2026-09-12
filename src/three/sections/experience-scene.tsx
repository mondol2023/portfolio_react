"use client";

import { useSceneContentStore } from "@/lib/store/scene-content-store";

import { sceneSectionProgress } from "../scene/camera-rig";
import { ExperienceTimeline } from "../objects/experience-timeline";

interface ExperienceSceneProps {
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  progress: number;
}

/**
 * Experience's slice of the persistent canvas. Reads real experience data
 * pushed in by `ExperienceSceneBridge` (mounted inside the DOM `Experience`
 * section itself) via `scene-content-store`.
 */
export function ExperienceScene({ tone, toneSoft, reducedMotion, progress }: ExperienceSceneProps) {
  const experiences = useSceneContentStore((state) => state.experiences);
  // Index 2 (Skills → Experience) is this section's entrance span; index 3
  // (Experience → Projects) is its exit.
  const entryProgress = sceneSectionProgress(progress, 2);
  const exitProgress = sceneSectionProgress(progress, 3);

  if (experiences.length === 0) return null;

  return (
    <ExperienceTimeline
      experiences={experiences}
      tone={tone}
      toneSoft={toneSoft}
      reducedMotion={reducedMotion}
      entryProgress={entryProgress}
      exitProgress={exitProgress}
    />
  );
}
