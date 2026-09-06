import { create } from "zustand";

import { SCORE_RULES } from "../config/game-config";

import type { AudioCue } from "../types/game";

/**
 * The visitor's world score — deliberately separate from the host portfolio's
 * exploration XP store. The two systems stay independent: this one counts
 * merges, splits and collections inside the world, the host's counts page
 * discovery. `GameProvider`'s `onEvent` bridge may mirror events outward, but
 * neither store reaches into the other.
 */
export type ScoreReason = "merge" | "split" | "collect";

interface ScoreStoreState {
  points: number;
  merges: number;
  splits: number;
  collects: number;
  /** Combo multiplier, 1..max; grows while scoring stays hot, decays when cold. */
  multiplier: number;
  /** Applies the current multiplier, records the reason, returns points gained. */
  addPoints(base: number, reason: ScoreReason): number;
  /** Nudges the multiplier up after a scoring event. */
  heat(): void;
  /** One decay tick — called by the score system while the combo is cold. */
  cool(): void;
  reset(): void;
}

export const useScoreStore = create<ScoreStoreState>()((set, get) => ({
  points: 0,
  merges: 0,
  splits: 0,
  collects: 0,
  multiplier: 1,

  addPoints(base, reason) {
    const gained = Math.round(base * get().multiplier);
    set((state) => ({
      points: state.points + gained,
      merges: state.merges + (reason === "merge" ? 1 : 0),
      splits: state.splits + (reason === "split" ? 1 : 0),
      collects: state.collects + (reason === "collect" ? 1 : 0),
    }));
    return gained;
  },

  heat() {
    set((state) => ({
      multiplier: Math.min(state.multiplier + SCORE_RULES.multiplierStep, SCORE_RULES.multiplierMax),
    }));
  },

  cool() {
    set((state) => ({
      multiplier: Math.max(1, state.multiplier - SCORE_RULES.multiplierDecayStep),
    }));
  },

  reset() {
    set({ points: 0, merges: 0, splits: 0, collects: 0, multiplier: 1 });
  },
}));

/** Cue a scoring event should trigger; kept next to the reasons it maps from. */
export function cueForReason(reason: ScoreReason): AudioCue {
  return reason === "merge" ? "merge" : reason === "split" ? "split" : "collect";
}
