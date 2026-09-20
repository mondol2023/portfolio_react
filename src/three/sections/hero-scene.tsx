"use client";

import type { SceneBudget } from "@/lib/experience/device-tier";
import type { SceneryDefinition } from "@/lib/experience/scenery";

import { HeroSculpture } from "../objects/hero";

interface HeroSceneProps {
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  budget: SceneBudget;
  pointer: { current: { x: number; y: number } };
  scenery: SceneryDefinition;
}

/**
 * Hero's slice of the persistent canvas — the per-scenery form, dispatched on
 * `scenery.geometry` by `objects/hero`. Section-scene wrappers exist (rather
 * than mounting objects directly in `SceneCanvas`) so each section's local
 * scroll math and secondary elements stay scoped to their own small file.
 */
export function HeroScene({ tone, toneSoft, reducedMotion, budget, pointer, scenery }: HeroSceneProps) {
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
      scenery={scenery}
    />
  );
}
