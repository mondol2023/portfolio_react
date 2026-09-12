"use client";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { useSceneContentStore } from "@/lib/store/scene-content-store";

import { sceneSectionEnvelope } from "../scene/camera-rig";
import { SkillGalaxy } from "../objects/skill-galaxy";

interface SkillsSceneProps {
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  progress: number;
  budget: SceneBudget;
  pointer: { current: { x: number; y: number } };
}

/**
 * Skills' slice of the persistent canvas. Reads real skill data pushed in by
 * `SkillsSceneBridge` (mounted inside the DOM `Skills` section itself) via
 * `scene-content-store` rather than fetching or duplicating it — nothing
 * renders until that hand-off has happened at least once.
 */
export function SkillsScene({ tone, toneSoft, reducedMotion, progress, budget, pointer }: SkillsSceneProps) {
  const skills = useSceneContentStore((state) => state.skills);
  // Waypoint index 2 — About → Skills is the entrance span, Skills →
  // Experience the exit, with a dwell between the two.
  const { entry, exit } = sceneSectionEnvelope(progress, 2);

  if (skills.length === 0) return null;

  return (
    <SkillGalaxy
      skills={skills}
      tone={tone}
      toneSoft={toneSoft}
      reducedMotion={reducedMotion}
      budget={budget}
      pointer={pointer}
      entryProgress={entry}
      exitProgress={exit}
    />
  );
}
