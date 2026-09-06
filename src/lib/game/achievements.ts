import { SECTION_IDS } from "@/lib/constants/navigation";
import type { Achievement, AchievementId, GameProgressState } from "@/lib/types/game";

/**
 * Config-driven achievement definitions.
 *
 * Every unlock condition reads only from `GameProgressState`, so evaluating
 * the whole list is a pure pass over one object (`evaluateAchievements`
 * below) — nothing here depends on when or how often it is called.
 */
export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  adventurer: {
    id: "adventurer",
    title: "Adventurer",
    description: "Started the journey through the portfolio.",
    icon: "Rocket",
    isUnlocked: (state) => state.discoveredSections.length > 0,
  },
  explorer: {
    id: "explorer",
    title: "Explorer",
    description: "Visited every section of the site.",
    icon: "Compass",
    isUnlocked: (state) => SECTION_IDS.every((id) => state.discoveredSections.includes(id)),
  },
  "skill-scout": {
    id: "skill-scout",
    title: "Skill Scout",
    description: "Looked into 5 different technologies.",
    icon: "Layers",
    isUnlocked: (state) => state.viewedSkills.length >= 5,
  },
  "project-hunter": {
    id: "project-hunter",
    title: "Project Hunter",
    description: "Opened 3 project case studies.",
    icon: "FolderSearch",
    isUnlocked: (state) => state.viewedProjects.length >= 3,
  },
  "full-clear": {
    id: "full-clear",
    title: "Full Clear",
    description: "Explored every section, and looked closer at the work and the stack.",
    icon: "Trophy",
    isUnlocked: (state) =>
      SECTION_IDS.every((id) => state.discoveredSections.includes(id)) &&
      state.viewedProjects.length > 0 &&
      state.viewedSkills.length > 0,
  },
};

export const ACHIEVEMENT_LIST: readonly Achievement[] = Object.values(ACHIEVEMENTS);

/** Ids of achievements that just became true, given the current state. */
export function evaluateAchievements(state: GameProgressState): AchievementId[] {
  const unlocked = new Set(state.unlockedAchievements);
  const newlyUnlocked: AchievementId[] = [];

  for (const achievement of ACHIEVEMENT_LIST) {
    if (unlocked.has(achievement.id)) continue;
    if (achievement.isUnlocked(state)) newlyUnlocked.push(achievement.id);
  }

  return newlyUnlocked;
}
