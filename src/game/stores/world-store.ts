import { create } from "zustand";

/**
 * World lifecycle and population telemetry.
 *
 * `status` is what the scene UI keys its fallbacks on; the population counts
 * are for the spawn system's bookkeeping and (cheap) diagnostics. Nothing in
 * here runs per frame — counts move only when shapes spawn or despawn.
 */
interface WorldStoreState {
  status: "idle" | "mounting" | "ready" | "error";
  interactiveCount: number;
  ambientCount: number;
  setStatus(status: WorldStoreState["status"]): void;
  setCounts(interactive: number, ambient: number): void;
}

export const useWorldStore = create<WorldStoreState>()((set) => ({
  status: "idle",
  interactiveCount: 0,
  ambientCount: 0,

  setStatus(status) {
    set((state) => (state.status === status ? state : { status }));
  },

  setCounts(interactive, ambient) {
    set((state) =>
      state.interactiveCount === interactive && state.ambientCount === ambient
        ? state
        : { interactiveCount: interactive, ambientCount: ambient },
    );
  },
}));
