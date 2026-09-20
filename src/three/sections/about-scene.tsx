"use client";

import type { SceneBudget } from "@/lib/experience/device-tier";
import type { SceneryDefinition } from "@/lib/experience/scenery";

import { AboutFragments } from "../objects/about-fragments";

interface AboutSceneProps {
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  budget: SceneBudget;
  scenery: SceneryDefinition;
}

/**
 * About's slice of the persistent canvas — the fragment cluster only.
 * Waypoint index 1: the envelope reads Hero → About as this section's
 * entrance and About → Skills as its exit, with a dwell between the two.
 */
export function AboutScene({ tone, toneSoft, reducedMotion, budget, scenery }: AboutSceneProps) {
  return (
    <AboutFragments
      tone={tone}
      toneSoft={toneSoft}
      reducedMotion={reducedMotion}
      budget={budget}
      sectionIndex={1}
      entrance={scenery.entrance}
    />
  );
}
