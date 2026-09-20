"use client";

import { useSceneSceneryStore } from "@/lib/store/scene-scenery-store";
import type { Skill } from "@/lib/types/content";

import { TechChain } from "./tech-chain";
import { GrowthList } from "./variants/growth";
import { SchematicList } from "./variants/schematic";

/**
 * Picks Skills' DOM display off the active scenery (S3-style seam, kept out
 * of `sections/skills.tsx` so that section stays a server component).
 * `blueprint` switches to the monospace index in `variants/schematic.tsx`,
 * `garden` to the sprouting pill list in `variants/growth.tsx`; every other
 * scenery keeps the marquee chain.
 *
 * Reads `renderScenery.id`, not the picker's committed `id`: Phase K's
 * crossfade stages this swap under the same veil-covered "geometry" commit
 * as the WebGL variant, so the list restructures in lockstep with the 3D
 * scene instead of cutting the instant a row is clicked.
 */
export function SkillsVariantSwitch({ skills }: { skills: Skill[] }) {
  const sceneryId = useSceneSceneryStore((state) => state.renderScenery.id);
  if (sceneryId === "blueprint") return <SchematicList skills={skills} />;
  if (sceneryId === "garden") return <GrowthList skills={skills} />;
  return <TechChain skills={skills} />;
}
