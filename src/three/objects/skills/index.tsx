"use client";

import type { SceneBudget } from "@/lib/experience/device-tier";
import type { SceneryDefinition } from "@/lib/experience/scenery";
import type { Skill } from "@/lib/types/content";

import { Constellation } from "./constellation";
import { Growth } from "./growth";
import { Orrery } from "./orrery";
import { Schematic } from "./schematic";

interface SkillsVariantProps {
  skills: Skill[];
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  budget: SceneBudget;
  /** This section's waypoint index: `entry` drives the scatter-to-constellation, `exit` fades the graph out. */
  sectionIndex: number;
  scenery: SceneryDefinition;
}

/**
 * Picks Skills' per-scenery variant off `scenery.skillsVariant` (S3). The
 * only switch on a scenery id anywhere under `src/three/objects/skills` —
 * every other file reads a definition, never branches on one.
 */
export function SkillsVariant({ scenery, ...props }: SkillsVariantProps) {
  // Unpacked here rather than handing each variant the whole definition: a
  // variant that could read `scenery` would eventually branch on it.
  const shared = { ...props, hueSpread: scenery.hueSpread, entrance: scenery.entrance };

  switch (scenery.skillsVariant) {
    case "schematic":
      return <Schematic {...shared} />;
    case "orrery":
      return <Orrery {...shared} />;
    case "growth":
      return <Growth {...shared} />;
    case "constellation":
    default:
      return <Constellation {...shared} />;
  }
}
