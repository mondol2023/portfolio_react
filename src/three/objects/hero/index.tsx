"use client";

import type { SceneryDefinition } from "@/lib/experience/scenery";

import type { HeroFormProps } from "./composition";
import { DraftingHero } from "./drafting";
import { OrganicHero } from "./organic";
import { OrreryHero } from "./orrery";
import { PlatonicHero } from "./platonic";

export { heroShellSpin } from "./composition";

interface HeroSculptureProps extends HeroFormProps {
  scenery: SceneryDefinition;
}

/**
 * Picks Hero's per-scenery form off `scenery.geometry` (S3) — the same
 * dispatch `skills/index.tsx` and `projects/index.tsx` already use, and the
 * only switch on a scenery field anywhere under `src/three/objects/hero`.
 *
 * Before Phase L, `geometry` was declared in `SceneryDefinition` and read by
 * nothing: all four worlds rendered the atelier sphere-and-torus in a
 * different hue, which is what Part 16's first checkbox rejects. Each world
 * now composes its own object out of its own material family.
 */
export function HeroSculpture({ scenery, ...props }: HeroSculptureProps) {
  switch (scenery.geometry) {
    case "drafting":
      return <DraftingHero {...props} />;
    case "orrery":
      return <OrreryHero {...props} />;
    case "organic":
      return <OrganicHero {...props} />;
    case "platonic":
    default:
      return <PlatonicHero {...props} />;
  }
}
