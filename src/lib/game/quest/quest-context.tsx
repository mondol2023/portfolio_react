"use client";

import { createContext, useCallback, useEffect, useMemo, useReducer, type ReactNode } from "react";

import {
  ACHIEVEMENT_RULES,
  QUEST_STORAGE_KEY,
  XP_AWARDS,
  levelForSection,
} from "./quest-constants";
import type { AchievementId, GameId, QuestContextValue, QuestState } from "./quest-types";

/**
 * The quest store.
 *
 * A reducer rather than a pile of `useState` calls, because almost every action
 * touches three fields at once — the record of what happened, the XP it earns,
 * and any achievement it unlocks — and those must move together or the XP and
 * the badge can disagree.
 *
 * Every award is idempotent: an action whose record already exists returns the
 * previous state object unchanged, so React bails out of the re-render. That is
 * what makes it safe for `visitSection` to be called from an effect that runs on
 * every scroll-spy change.
 */

const INITIAL_STATE: QuestState = {
  currentLevel: 1,
  visitedSections: [],
  openedProjects: [],
  gamesPlayed: [],
  skillsExplored: false,
  missionComplete: false,
  achievements: [],
  pendingAchievements: [],
  xp: 0,
  soundEnabled: false,
};

type QuestAction =
  | { type: "restore"; state: QuestState }
  | { type: "visit-section"; sectionId: string }
  | { type: "open-project"; projectId: string }
  | { type: "play-game"; gameId: GameId }
  | { type: "explore-skills" }
  | { type: "complete-mission" }
  | { type: "dismiss-achievement"; id: AchievementId }
  | { type: "set-sound"; enabled: boolean };

/**
 * Runs every unlock rule against the state as it now stands and appends
 * whatever newly qualifies. Called after each mutation rather than inside each
 * case, so a rule can depend on any combination of fields without its unlock
 * having to be remembered at every site that could satisfy it.
 */
function withUnlocks(state: QuestState): QuestState {
  const unlocked = ACHIEVEMENT_RULES.filter(
    (rule) => !state.achievements.includes(rule.id) && rule.isUnlocked(state),
  ).map((rule) => rule.id);

  if (unlocked.length === 0) return state;

  return {
    ...state,
    achievements: [...state.achievements, ...unlocked],
    pendingAchievements: [...state.pendingAchievements, ...unlocked],
  };
}

function reducer(state: QuestState, action: QuestAction): QuestState {
  switch (action.type) {
    case "restore":
      return action.state;

    case "visit-section": {
      const level = levelForSection(action.sectionId) ?? state.currentLevel;
      const seen = state.visitedSections.includes(action.sectionId);

      // The level still follows the scroll even for a section already visited,
      // but only the first visit pays.
      if (seen) {
        return level === state.currentLevel ? state : { ...state, currentLevel: level };
      }

      return withUnlocks({
        ...state,
        currentLevel: level,
        visitedSections: [...state.visitedSections, action.sectionId],
        xp: state.xp + XP_AWARDS.visitSection,
      });
    }

    case "open-project": {
      if (state.openedProjects.includes(action.projectId)) return state;
      return withUnlocks({
        ...state,
        openedProjects: [...state.openedProjects, action.projectId],
        xp: state.xp + XP_AWARDS.openProject,
      });
    }

    case "play-game": {
      if (state.gamesPlayed.includes(action.gameId)) return state;
      return withUnlocks({
        ...state,
        gamesPlayed: [...state.gamesPlayed, action.gameId],
        xp: state.xp + XP_AWARDS.playGame,
      });
    }

    case "explore-skills": {
      if (state.skillsExplored) return state;
      return withUnlocks({
        ...state,
        skillsExplored: true,
        xp: state.xp + XP_AWARDS.exploreSkills,
      });
    }

    case "complete-mission": {
      if (state.missionComplete) return state;
      return withUnlocks({
        ...state,
        missionComplete: true,
        xp: state.xp + XP_AWARDS.completeMission,
      });
    }

    case "dismiss-achievement": {
      if (!state.pendingAchievements.includes(action.id)) return state;
      return {
        ...state,
        pendingAchievements: state.pendingAchievements.filter((id) => id !== action.id),
      };
    }

    case "set-sound":
      return state.soundEnabled === action.enabled
        ? state
        : { ...state, soundEnabled: action.enabled };
  }
}

/**
 * Reads a previous state back out of session storage.
 *
 * Defensive rather than trusting: the key is visitor-writable, so anything that
 * is not the shape we wrote is discarded instead of crashing the provider that
 * wraps the entire public site.
 */
function readStoredState(): QuestState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(QUEST_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const candidate = parsed as Partial<QuestState>;
    const strings = (value: unknown): string[] =>
      Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

    return {
      ...INITIAL_STATE,
      currentLevel:
        typeof candidate.currentLevel === "number" ? candidate.currentLevel : INITIAL_STATE.currentLevel,
      visitedSections: strings(candidate.visitedSections),
      openedProjects: strings(candidate.openedProjects),
      gamesPlayed: strings(candidate.gamesPlayed) as GameId[],
      skillsExplored: candidate.skillsExplored === true,
      missionComplete: candidate.missionComplete === true,
      achievements: strings(candidate.achievements) as AchievementId[],
      // Deliberately not restored: a toast that was already on screen when the
      // visitor navigated has been seen, and re-showing it on every route change
      // is exactly the repeated notification the brief rules out.
      pendingAchievements: [],
      xp: typeof candidate.xp === "number" && Number.isFinite(candidate.xp) ? candidate.xp : 0,
      soundEnabled: candidate.soundEnabled === true,
    };
  } catch {
    return null;
  }
}

export const QuestContext = createContext<QuestContextValue | null>(null);

export function QuestProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // Restored after mount rather than in the reducer's lazy initializer: the
  // server has no session storage, and a first client render that disagreed
  // with the server HTML would be a hydration mismatch.
  useEffect(() => {
    const stored = readStoredState();
    if (stored) dispatch({ type: "restore", state: stored });
  }, []);

  useEffect(() => {
    if (state === INITIAL_STATE) return;
    try {
      window.sessionStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Private-mode quotas and disabled storage are not errors worth surfacing
      // — the quest layer simply becomes per-page rather than per-session.
    }
  }, [state]);

  const visitSection = useCallback(
    (sectionId: string) => dispatch({ type: "visit-section", sectionId }),
    [],
  );
  const openProject = useCallback(
    (projectId: string) => dispatch({ type: "open-project", projectId }),
    [],
  );
  const playGame = useCallback((gameId: GameId) => dispatch({ type: "play-game", gameId }), []);
  const exploreSkills = useCallback(() => dispatch({ type: "explore-skills" }), []);
  const completeMission = useCallback(() => dispatch({ type: "complete-mission" }), []);
  const dismissAchievement = useCallback(
    (id: AchievementId) => dispatch({ type: "dismiss-achievement", id }),
    [],
  );
  const setSoundEnabled = useCallback(
    (enabled: boolean) => dispatch({ type: "set-sound", enabled }),
    [],
  );

  const value = useMemo<QuestContextValue>(
    () => ({
      ...state,
      visitSection,
      openProject,
      playGame,
      exploreSkills,
      completeMission,
      dismissAchievement,
      setSoundEnabled,
    }),
    [
      state,
      visitSection,
      openProject,
      playGame,
      exploreSkills,
      completeMission,
      dismissAchievement,
      setSoundEnabled,
    ],
  );

  return <QuestContext.Provider value={value}>{children}</QuestContext.Provider>;
}
