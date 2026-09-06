import { EXPLORER_LEVEL_THRESHOLDS } from "./game-config";

/**
 * Turns a raw XP count into a level and a fill fraction for the HUD's bar.
 *
 * Same spirit as `lib/utils/career.ts`'s `playerLevel` — the number is derived,
 * never stored — but this one measures exploration of the *site*, not the
 * developer's career, which is why it lives in its own module rather than
 * being folded into that one.
 */
export interface ExplorerProgress {
  /** 1-based. */
  level: number;
  /** 0..1 through the current level. */
  progress: number;
  xp: number;
  /** XP needed for the next level, or `null` at the final one. */
  nextLevelXp: number | null;
}

export function explorerProgress(xp: number): ExplorerProgress {
  const thresholds = EXPLORER_LEVEL_THRESHOLDS;

  let level = 1;
  for (let i = 1; i < thresholds.length; i++) {
    const threshold = thresholds[i];
    if (threshold !== undefined && xp >= threshold) level = i + 1;
    else break;
  }

  const floor = thresholds[level - 1] ?? 0;
  const nextLevelXp = thresholds[level] ?? null;
  const progress = nextLevelXp === null ? 1 : (xp - floor) / (nextLevelXp - floor);

  return { level, progress: Math.min(1, Math.max(0, progress)), xp, nextLevelXp };
}
