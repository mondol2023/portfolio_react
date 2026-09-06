/**
 * Domain shapes for the exploration/gamification layer.
 *
 * Mirrors the convention in `lib/types/content.ts`: plain data, no React, no
 * Firestore. Progress lives in the browser only (see `lib/store/game-store.ts`)
 * — there is no server-side model to keep in sync with this one.
 */

export type GameMode = "normal" | "game";

export const ACHIEVEMENT_IDS = [
  "adventurer",
  "explorer",
  "skill-scout",
  "project-hunter",
  "full-clear",
] as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  /**
   * Lucide icon name, kept as a string rather than a component reference so
   * this stays a plain data module — the component that renders a toast or a
   * badge is what owns the icon lookup.
   */
  icon: string;
  isUnlocked: (state: GameProgressState) => boolean;
}

export interface GameProgressState {
  mode: GameMode;
  /**
   * Exploration XP. Deliberately not a claim about the developer — it counts
   * how much of the portfolio *this visitor* has opened, nothing else. The
   * developer's own numbers (career length, stack) stay exactly where they
   * already lived: `lib/utils/career.ts` and the content documents.
   */
  xp: number;
  /** Section ids (see `lib/constants/navigation.ts`) the visitor has scrolled to. */
  discoveredSections: string[];
  /** Skill ids opened via the tech chain's floating card. */
  viewedSkills: string[];
  /** Project ids whose case study page has been opened. */
  viewedProjects: string[];
  unlockedAchievements: AchievementId[];
}
