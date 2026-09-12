"use client";

import type { SceneBudget } from "@/lib/experience/device-tier";

import { sceneSectionProgress } from "../scene/camera-rig";
import { HeroSculpture } from "../objects/hero-sculpture";

interface HeroSceneProps {
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  progress: number;
  budget: SceneBudget;
  pointer: { current: { x: number; y: number } };
}

/**
 * Hero's slice of the persistent canvas — just the sculpture for now.
 * Section-scene wrappers exist (rather than mounting objects directly in
 * `SceneCanvas`) so each section's local scroll math and future secondary
 * elements stay scoped to their own small file as later phases add them.
 */
export function HeroScene({ tone, toneSoft, reducedMotion, progress, budget, pointer }: HeroSceneProps) {
  const heroProgress = sceneSectionProgress(progress, 0);
  // Fades the sculpture out across the About → Skills camera segment, so it
  // recedes once the story has moved past About rather than lingering behind
  // every later section.
  const exitProgress = sceneSectionProgress(progress, 1);

  return (
    <HeroSculpture
      tone={tone}
      toneSoft={toneSoft}
      pointer={pointer}
      reducedMotion={reducedMotion}
      heroProgress={heroProgress}
      exitProgress={exitProgress}
      budget={budget}
    />
  );
}
