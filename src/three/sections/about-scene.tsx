"use client";

import type { SceneBudget } from "@/lib/experience/device-tier";

import { AboutFragments } from "../objects/about-fragments";
import { sceneSectionProgress } from "../scene/camera-rig";

interface AboutSceneProps {
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  budget: SceneBudget;
  progress: number;
}

/**
 * About's slice of the persistent canvas — the fragment cluster only.
 * Waypoint index 0 is Hero → About (this section's entrance), index 1 is
 * About → Skills (this section's exit) — the same two spans Hero already
 * reads from index 0/1, since About sits immediately after Hero on the path.
 */
export function AboutScene({ tone, toneSoft, reducedMotion, budget, progress }: AboutSceneProps) {
  const entryProgress = sceneSectionProgress(progress, 0);
  const exitProgress = sceneSectionProgress(progress, 1);

  return (
    <AboutFragments
      tone={tone}
      toneSoft={toneSoft}
      reducedMotion={reducedMotion}
      budget={budget}
      entryProgress={entryProgress}
      exitProgress={exitProgress}
    />
  );
}
