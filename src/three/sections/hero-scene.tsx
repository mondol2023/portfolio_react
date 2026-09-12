"use client";

import type { SceneBudget } from "@/lib/experience/device-tier";

import { sceneSectionEnvelope, sceneSectionProgress } from "../scene/camera-rig";
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
  // Raw, not enveloped: this drives the sculpture's scroll rotation, which
  // should track the camera's own travel out of Hero exactly.
  const heroProgress = sceneSectionProgress(progress, 0);
  // Hero is the one section whose object deliberately lives on through the
  // next one, so it takes About's envelope rather than its own: it recedes
  // across About → Skills instead of lingering behind every later section.
  const { exit: exitProgress } = sceneSectionEnvelope(progress, 1);

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
