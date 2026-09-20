"use client";

import { Suspense } from "react";

import type { SceneBudget } from "@/lib/experience/device-tier";
import type { ScenePalette } from "@/lib/experience/scene-palette";
import type { SceneryDefinition } from "@/lib/experience/scenery";
import type { Project } from "@/lib/types/content";

import { Corridor } from "./corridor";
import { Foliage } from "./foliage";
import { Monoliths } from "./monoliths";
import { Plansheets } from "./plansheets";

interface ProjectsVariantProps {
  projects: Project[];
  palette: ScenePalette;
  budget: SceneBudget;
  reducedMotion: boolean;
  pointer: { current: { x: number; y: number } };
  /** This section's waypoint index: `entry` opens the corridor, `exit` closes it again. */
  sectionIndex: number;
  scenery: SceneryDefinition;
}

/**
 * Picks Projects' per-scenery variant off `scenery.projectsVariant` (S3). The
 * only switch on a scenery id anywhere under `src/three/objects/projects` —
 * every other file reads a definition, never branches on one.
 */
export function ProjectsVariant({ scenery, ...props }: ProjectsVariantProps) {
  switch (scenery.projectsVariant) {
    case "plansheets":
      return <Plansheets {...props} />;
    case "monoliths":
      // S10: `Monoliths` suspends on its first KTX2 fetch (Phase H's ORM/
      // normal maps). Falling back to the fully procedural `Corridor` is a
      // one-time, barely-visible swap on first load — never a blank canvas.
      return (
        <Suspense fallback={<Corridor {...props} />}>
          <Monoliths {...props} />
        </Suspense>
      );
    case "foliage":
      // S10: `Foliage` suspends on its first KTX2 fetch (Phase J's leaf
      // colour/normal maps), same one-time swap as `Monoliths` above.
      return (
        <Suspense fallback={<Corridor {...props} />}>
          <Foliage {...props} />
        </Suspense>
      );
    case "corridor":
    default:
      return <Corridor {...props} />;
  }
}
