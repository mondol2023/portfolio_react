"use client";

import type { SceneBudget } from "@/lib/experience/device-tier";
import type { SceneryDefinition } from "@/lib/experience/scenery";
import { useSceneContentStore } from "@/lib/store/scene-content-store";

import { SkillsVariant } from "../objects/skills";

interface SkillsSceneProps {
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  budget: SceneBudget;
  scenery: SceneryDefinition;
}

/**
 * Skills' slice of the persistent canvas. Reads real skill data pushed in by
 * `SkillsSceneBridge` (mounted inside the DOM `Skills` section itself) via
 * `scene-content-store` rather than fetching or duplicating it — nothing
 * renders until that hand-off has happened at least once.
 */
export function SkillsScene({ tone, toneSoft, reducedMotion, budget, scenery }: SkillsSceneProps) {
  const skills = useSceneContentStore((state) => state.skills);

  if (skills.length === 0) return null;

  return (
    <SkillsVariant
      skills={skills}
      tone={tone}
      toneSoft={toneSoft}
      reducedMotion={reducedMotion}
      budget={budget}
      // Waypoint index 2 — About → Skills is the entrance span, Skills →
      // Experience the exit, with a dwell between the two.
      sectionIndex={2}
      scenery={scenery}
    />
  );
}
