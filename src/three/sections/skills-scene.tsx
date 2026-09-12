"use client";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { useSceneContentStore } from "@/lib/store/scene-content-store";

import { sceneSectionProgress } from "../scene/camera-rig";
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
  // Index 1 (About → Skills) is this section's own entrance span; index 2
  // (Skills → Experience) is its exit — the same "entry uses the previous
  // waypoint, exit uses this one" pattern About already established.
  const entryProgress = sceneSectionProgress(progress, 1);
  const exitProgress = sceneSectionProgress(progress, 2);

  if (skills.length === 0) return null;

  return (
    <SkillGalaxy
      skills={skills}
      tone={tone}
      toneSoft={toneSoft}
      reducedMotion={reducedMotion}
      budget={budget}
      pointer={pointer}
      entryProgress={entryProgress}
      exitProgress={exitProgress}
    />
  );
}
