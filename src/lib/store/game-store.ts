import { evaluateAchievements } from "@/lib/game/achievements";
import { XP_RULES } from "@/lib/game/game-config";
import type { AchievementId, GameMode, GameProgressState } from "@/lib/types/game";

/**
 * Exploration progress store.
 *
 * A vanilla subscribe/getSnapshot store — the same shape `use-scene-budget.ts`
 * and `use-motion-preference.ts` already build on top of `useSyncExternalStore`
 * for, chosen over a state library so this feature adds zero new dependencies.
 * Unlike those two this one is *written* to (a section gets discovered, a
 * project gets opened), so it also keeps a live subscriber list and persists
 * every change to `localStorage`.
 *
 * Every mutator returns the achievement ids that just unlocked, so a caller —
 * in practice only `GameProgressTracker` — can turn them into a toast without
 * re-deriving the diff itself.
 */

const STORAGE_KEY = "portfolio:game-progress:v1";

function createDefaultState(): GameProgressState {
  return {
    mode: "normal",
    xp: 0,
    discoveredSections: [],
    viewedSkills: [],
    viewedProjects: [],
    unlockedAchievements: [],
  };
}

/** Stable reference: both the initial client state and every server snapshot. */
const DEFAULT_STATE: GameProgressState = createDefaultState();

let state: GameProgressState = DEFAULT_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing / storage quota — progress just stays session-only.
  }
}

/** Reads any progress saved on a previous visit. Runs once, lazily. */
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<GameProgressState>;
    state = { ...createDefaultState(), ...parsed };
  } catch {
    // Corrupt or foreign JSON under this key — start clean rather than throw.
  }
}

function addUnique(list: readonly string[], value: string): string[] | null {
  return list.includes(value) ? null : [...list, value];
}

/** Applies a state change, folds in any newly-true achievements, persists, notifies. */
function commit(next: GameProgressState): AchievementId[] {
  const unlocked = evaluateAchievements(next);
  state =
    unlocked.length > 0 ? { ...next, unlockedAchievements: [...next.unlockedAchievements, ...unlocked] } : next;
  persist();
  notify();
  return unlocked;
}

export const gameStore = {
  subscribe(listener: () => void): () => void {
    hydrate();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  getSnapshot(): GameProgressState {
    hydrate();
    return state;
  },

  getServerSnapshot(): GameProgressState {
    return DEFAULT_STATE;
  },

  setMode(mode: GameMode): AchievementId[] {
    hydrate();
    if (state.mode === mode) return [];
    return commit({ ...state, mode });
  },

  discoverSection(id: string): AchievementId[] {
    hydrate();
    const discoveredSections = addUnique(state.discoveredSections, id);
    if (!discoveredSections) return [];
    return commit({ ...state, discoveredSections, xp: state.xp + XP_RULES.sectionDiscovered });
  },

  viewSkill(id: string): AchievementId[] {
    hydrate();
    const viewedSkills = addUnique(state.viewedSkills, id);
    if (!viewedSkills) return [];
    return commit({ ...state, viewedSkills, xp: state.xp + XP_RULES.skillDiscovered });
  },

  viewProject(id: string): AchievementId[] {
    hydrate();
    const viewedProjects = addUnique(state.viewedProjects, id);
    if (!viewedProjects) return [];
    return commit({ ...state, viewedProjects, xp: state.xp + XP_RULES.projectOpened });
  },
};
