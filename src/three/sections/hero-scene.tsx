"use client";

import type { SceneBudget } from "@/lib/experience/device-tier";

import { HeroSculpture } from "../objects/hero-sculpture";

interface HeroSceneProps {
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  budget: SceneBudget;
  pointer: { current: { x: number; y: number } };
}

/**
 * Hero's slice of the persistent canvas — just the sculpture for now.
 * Section-scene wrappers exist (rather than mounting objects directly in
 * `SceneCanvas`) so each section's local scroll math and future secondary
 * elements stay scoped to their own small file as later phases add them.
 */
export function HeroScene({ tone, toneSoft, reducedMotion, budget, pointer }: HeroSceneProps) {
  return (
    <HeroSculpture
      tone={tone}
      toneSoft={toneSoft}
      pointer={pointer}
      reducedMotion={reducedMotion}
      sectionIndex={0}
      // Hero is the one section whose object deliberately lives on through the
      // next one, so it recedes on About's exit rather than its own: across
      // About → Skills, instead of lingering behind every later section.
      exitIndex={1}
      budget={budget}
    />
  );
}
