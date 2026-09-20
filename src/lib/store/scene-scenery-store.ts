import { create } from "zustand";

import { getSceneryDefinition, SCENERY_IDS, type SceneryDefinition, type SceneryId } from "@/lib/experience/scenery";
import { cancelSceneryCrossfade, runSceneryCrossfade } from "@/lib/experience/scenery-transition";

/**
 * Global scenery state (S1 of `SCENERY_SYSTEM_PLAN.md`), in two places at
 * once: this store, which WebGL reads via `getState()`, and `data-scenery`
 * on `<html>`, which `globals.css` reads. Neither re-renders the other.
 *
 * Same imperative shape as `scene-interaction-store.ts`. Persistence and the
 * `<html>` attribute are side effects of `setScenery`/`pinAtelier`, not a
 * subscriber elsewhere, so a caller can never update one without the other.
 *
 * Phase K splits what used to be one field into two. `id` is the committed
 * choice — what the picker highlights and what persists — and updates the
 * instant a row is clicked, same as before. `renderScenery` is what WebGL and
 * `data-scenery` actually reflect, and now lags `id` by up to 900ms: Phase K's
 * crossfade (`scenery-transition.ts`) mutates it track by track (exposure,
 * palette, lights, then the rest) instead of `setScenery` replacing it in one
 * jump. A caller never touches `renderScenery` directly.
 */

const STORAGE_KEY = "portfolio:scenery";

interface SceneSceneryState {
  id: SceneryId;
  renderScenery: SceneryDefinition;
  /**
   * User-driven choice from the picker. Persists immediately; the actual
   * WebGL/DOM swap runs on `scenery-transition.ts`'s 900ms stagger unless
   * `reducedMotion` collapses it to one frame (§11).
   */
  setScenery(id: SceneryId, reducedMotion: boolean): void;
  /**
   * No crossfade, ever — hydration (S2) and the `three-scenery` admin flag
   * (S12) resolve before or outside of any user gesture, so there is nothing
   * to animate from.
   */
  setSceneryInstant(id: SceneryId): void;
  /**
   * The `three-scenery` admin flag is off: pins everyone to `atelier` without
   * touching `localStorage`, so a saved choice reappears once the flag is
   * switched back on instead of being clobbered.
   */
  pinAtelier(): void;
}

function isSceneryId(value: string | null): value is SceneryId {
  return value !== null && (SCENERY_IDS as readonly string[]).includes(value);
}

function writeAttribute(id: SceneryId): void {
  if (typeof document !== "undefined") document.documentElement.dataset.scenery = id;
}

export const useSceneSceneryStore = create<SceneSceneryState>()((set, get) => ({
  // Matches the static `data-scenery="atelier"` the root layout renders
  // before hydration (S2) — never a mismatch to correct.
  id: "atelier",
  renderScenery: getSceneryDefinition("atelier"),
  setScenery: (id, reducedMotion) => {
    const fromId = get().renderScenery.id;
    set({ id });
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Private browsing / storage disabled — the choice just won't survive a reload.
    }

    runSceneryCrossfade(fromId, id, reducedMotion, {
      exposure: (target) =>
        set((state) => ({
          renderScenery: { ...state.renderScenery, toneMapping: target.toneMapping, exposure: target.exposure },
        })),
      palette: (target) => set((state) => ({ renderScenery: { ...state.renderScenery, skin: target.skin } })),
      lights: (target) => set((state) => ({ renderScenery: { ...state.renderScenery, lights: target.lights } })),
      geometry: (target) => {
        writeAttribute(target.id);
        set({ renderScenery: target });
      },
    });
  },
  setSceneryInstant: (id) => {
    // The flag can flip mid-crossfade; without this the abandoned timeline
    // commits its target on top of `id` and leaves the veil down for good.
    cancelSceneryCrossfade();
    writeAttribute(id);
    set({ id, renderScenery: getSceneryDefinition(id) });
  },
  pinAtelier: () => {
    get().setSceneryInstant("atelier");
  },
}));

/** Reads the persisted choice, if any, without writing anything back. */
export function readStoredScenery(): SceneryId | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isSceneryId(value) ? value : null;
  } catch {
    return null;
  }
}
