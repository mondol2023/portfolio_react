/**
 * Tunable numbers for the exploration layer, gathered in one place so no
 * component has to guess at a magic number — same reasoning as
 * `lib/experience/springs.ts` naming its physics instead of inlining it.
 *
 * Kept deliberately small: the brief warns against awarding XP excessively,
 * so there are three sources, not a dozen.
 */
export const XP_RULES = {
  sectionDiscovered: 15,
  skillDiscovered: 5,
  projectOpened: 20,
} as const;

/**
 * XP required to *reach* each level, index = level - 1. The last entry is the
 * ceiling — once past it, progress reads as full rather than overflowing.
 * Tuned against six sections (90 XP) and a handful of skills/projects, so a
 * visitor who reads the whole page comfortably reaches the final level.
 */
export const EXPLORER_LEVEL_THRESHOLDS = [0, 40, 90, 160, 260] as const;

/** What the HUD calls the section the visitor is currently reading. */
export const QUEST_LABELS: Record<string, string> = {
  home: "Begin the adventure",
  about: "Meet the player",
  skills: "Discover the stack",
  projects: "Explore the missions",
  experience: "Trace the journey",
  contact: "Complete the final quest",
};
