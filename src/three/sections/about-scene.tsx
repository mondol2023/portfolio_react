"use client";

import type { SceneBudget } from "@/lib/experience/device-tier";

import { AboutFragments } from "../objects/about-fragments";

interface AboutSceneProps {
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  budget: SceneBudget;
}

/**
 * About's slice of the persistent canvas — the fragment cluster only.
 * Waypoint index 1: the envelope reads Hero → About as this section's
 * entrance and About → Skills as its exit, with a dwell between the two.
 */
export function AboutScene({ tone, toneSoft, reducedMotion, budget }: AboutSceneProps) {
  return (
    <AboutFragments
      tone={tone}
      toneSoft={toneSoft}
      reducedMotion={reducedMotion}
      budget={budget}
      sectionIndex={1}
    />
  );
}
