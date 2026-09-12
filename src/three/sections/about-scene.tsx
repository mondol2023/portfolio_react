"use client";

import type { SceneBudget } from "@/lib/experience/device-tier";

import { AboutFragments } from "../objects/about-fragments";
import { sceneSectionEnvelope } from "../scene/camera-rig";

interface AboutSceneProps {
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  budget: SceneBudget;
  progress: number;
}

/**
 * About's slice of the persistent canvas — the fragment cluster only.
 * Waypoint index 1: the envelope reads Hero → About as this section's
 * entrance and About → Skills as its exit, with a dwell between the two.
 */
export function AboutScene({ tone, toneSoft, reducedMotion, budget, progress }: AboutSceneProps) {
  const { entry, exit } = sceneSectionEnvelope(progress, 1);

  return (
    <AboutFragments
      tone={tone}
      toneSoft={toneSoft}
      reducedMotion={reducedMotion}
      budget={budget}
      entryProgress={entry}
      exitProgress={exit}
    />
  );
}
