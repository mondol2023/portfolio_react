"use client";

import { useSceneContentStore } from "@/lib/store/scene-content-store";

import { sceneSectionEnvelope } from "../scene/camera-rig";
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
  // Waypoint index 4 — Experience is the fifth section in DOM order, so
  // Projects → Experience is the entrance span and Experience → Contact the
  // exit, with a dwell between the two.
  const { entry, exit } = sceneSectionEnvelope(progress, 4);

  if (experiences.length === 0) return null;

  return (
    <ExperienceTimeline
      experiences={experiences}
      tone={tone}
      toneSoft={toneSoft}
      reducedMotion={reducedMotion}
      entryProgress={entry}
      exitProgress={exit}
    />
  );
}
