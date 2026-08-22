import { Compass, Gamepad2, Network, ScrollText, Trophy } from "lucide-react";

import { SECTION_IDS } from "@/lib/constants/navigation";

import type { Achievement, AchievementId, QuestLevel } from "./quest-types";

/**
 * Tuning for the quest layer, in one place so the numbers are legible rather
 * than scattered as literals across components.
 */

/** XP awarded once per distinct occurrence — never repeated for the same id. */
export const XP_AWARDS = {
  visitSection: 50,
  openProject: 100,
  playGame: 150,
  exploreSkills: 50,
  completeMission: 100,
} as const;

/**
 * What a full XP bar means.
 *
 * Deliberately reachable but not trivially so: six sections (300) plus three
 * projects (300) plus both games (300) plus the skills chain (50) plus the
 * contact form (100) lands just past it. The bar is an encouragement, not a
 * score to be completed, so overshooting is fine and simply clamps.
 */
export const XP_TARGET = 1000;

/**
 * Section → level. The bonus zone gets a level of its own even though it is a
 * separate route, because a visitor who plays a game has plainly progressed.
 */
// `satisfies` rather than a `readonly QuestLevel[]` annotation: the annotation
// would widen this to an array, and callers that read `QUEST_LEVELS[0]` as the
// fallback level would then have to null-check a member that plainly exists.
export const QUEST_LEVELS = [
  { level: 1, sectionId: "home", label: "Spawn Point" },
  { level: 2, sectionId: "about", label: "Player Profile" },
  { level: 3, sectionId: "skills", label: "Skill Network" },
  { level: 4, sectionId: "projects", label: "Quest Board" },
  { level: 5, sectionId: "experience", label: "Journey Map" },
  { level: 6, sectionId: null, label: "Bonus Zone" },
  { level: 7, sectionId: "contact", label: "Final Mission" },
] as const satisfies readonly QuestLevel[];

export const MAX_LEVEL = QUEST_LEVELS.length;

/** How many projects count as "seeking quests" rather than a single glance. */
const QUEST_SEEKER_THRESHOLD = 2;

export function levelForSection(sectionId: string | null): number | null {
  if (!sectionId) return null;
  return QUEST_LEVELS.find((entry) => entry.sectionId === sectionId)?.level ?? null;
}

/**
 * Five achievements, at the low end of the brief's 5–7 range on purpose: each
 * one has to be worth interrupting the page for, and a sixth marginal one makes
 * the other five cheaper.
 */
export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  explorer: {
    id: "explorer",
    title: "Explorer",
    description: "Visited every section of the portfolio.",
    icon: Compass,
  },
  "tech-explorer": {
    id: "tech-explorer",
    title: "Tech Explorer",
    description: "Inspected a technology in the stack.",
    icon: Network,
  },
  "quest-seeker": {
    id: "quest-seeker",
    title: "Quest Seeker",
    description: "Opened more than one project case study.",
    icon: ScrollText,
  },
  gamer: {
    id: "gamer",
    title: "Gamer",
    description: "Played a game in the bonus zone.",
    icon: Gamepad2,
  },
  "final-level": {
    id: "final-level",
    title: "Final Level",
    description: "Reached the contact section.",
    icon: Trophy,
  },
};

/**
 * Unlock rules, kept as data next to the achievements they unlock so adding one
 * never means editing the reducer.
 */
export const ACHIEVEMENT_RULES: ReadonlyArray<{
  id: AchievementId;
  isUnlocked: (state: {
    visitedSections: readonly string[];
    openedProjects: readonly string[];
    gamesPlayed: readonly string[];
    skillsExplored: boolean;
  }) => boolean;
}> = [
  {
    id: "explorer",
    isUnlocked: (state) => SECTION_IDS.every((id) => state.visitedSections.includes(id)),
  },
  { id: "tech-explorer", isUnlocked: (state) => state.skillsExplored },
  {
    id: "quest-seeker",
    isUnlocked: (state) => state.openedProjects.length >= QUEST_SEEKER_THRESHOLD,
  },
  { id: "gamer", isUnlocked: (state) => state.gamesPlayed.length > 0 },
  { id: "final-level", isUnlocked: (state) => state.visitedSections.includes("contact") },
];

/** How long an achievement toast stays up before dismissing itself. */
export const ACHIEVEMENT_TOAST_MS = 5000;

/**
 * Session storage, not local storage and not Firestore: the progression is a
 * reading aid for one visit. A returning visitor starts fresh, which is the
 * intent — the alternative is a stranger's browser insisting they have already
 * seen work they have not.
 */
export const QUEST_STORAGE_KEY = "developer-quest.v1";
