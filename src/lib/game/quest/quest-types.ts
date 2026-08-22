import type { LucideIcon } from "lucide-react";

/**
 * Types for the Developer Quest progression layer.
 *
 * This is a *presentation* concern: nothing here is persisted to Firestore and
 * nothing here gates access to content. A visitor who never triggers any of it
 * still sees the entire portfolio. See GAME.md §1.9 risk 4.
 *
 * Kept in `lib/game/quest/` rather than `lib/game/` proper, which is the Snake
 * engine's own home — the two share a folder name and nothing else.
 */

export type AchievementId =
  | "explorer"
  | "tech-explorer"
  | "quest-seeker"
  | "gamer"
  | "final-level";

/** Matches the route segments under `/play`. */
export type GameId = "snake" | "whack-a-mole";

export interface Achievement {
  id: AchievementId;
  title: string;
  /** One line, shown in the toast. Plain language, not jargon. */
  description: string;
  icon: LucideIcon;
}

export interface QuestLevel {
  level: number;
  /**
   * Section id this level maps to, or `null` for the bonus zone — which lives
   * on its own route and so never wins the scroll-spy.
   */
  sectionId: string | null;
  label: string;
}

export interface QuestState {
  /** Derived from the active section; 1 until the visitor scrolls anywhere. */
  currentLevel: number;
  visitedSections: string[];
  /** Project ids opened this session — the guard for once-only XP. */
  openedProjects: string[];
  gamesPlayed: GameId[];
  /** Set once the visitor selects anything in the skills chain. */
  skillsExplored: boolean;
  /** Set on a successful contact-form submission. */
  missionComplete: boolean;
  achievements: AchievementId[];
  /** Unlocked but not yet shown to the visitor. Drained by the toast queue. */
  pendingAchievements: AchievementId[];
  xp: number;
  /**
   * Reserved. No sound assets ship today; this exists so that if any are ever
   * added they arrive muted-by-default with a control already in place, rather
   * than autoplaying. See the brief, Step 5.
   */
  soundEnabled: boolean;
}

export interface QuestActions {
  /** Called by the header as the scroll-spy's active section changes. */
  visitSection: (sectionId: string) => void;
  openProject: (projectId: string) => void;
  playGame: (gameId: GameId) => void;
  exploreSkills: () => void;
  completeMission: () => void;
  /** Removes the front of the pending queue once its toast has been seen. */
  dismissAchievement: (id: AchievementId) => void;
  setSoundEnabled: (enabled: boolean) => void;
}

export type QuestContextValue = QuestState & QuestActions;
