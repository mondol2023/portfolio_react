import { create } from "zustand";

import type { EntityId } from "../types/game";

/**
 * Discrete interaction state — what the pointer is *doing*, never where it is.
 *
 * Pointer coordinates update at pointer-event frequency and live in a plain
 * module-level tracker (`interactions/pointer-tracker.ts`, Phase 6), because
 * routing them through any store would re-render subscribers hundreds of times
 * a second. Only state changes worth a render live here: hover, drag, and
 * whether the interaction layer is armed at all.
 */
/** Screen-space point, px — the collect ring's anchor, not a world position. */
interface ScreenPoint {
  x: number;
  y: number;
}

interface InteractionStoreState {
  /** Interactions (poke/drag/throw) are currently allowed. */
  armed: boolean;
  hoveredId: EntityId | null;
  draggingId: EntityId | null;
  /** 0..1 hold-to-collect charge, published every frame during a held press; 0 when idle. */
  collectProgress: number;
  /** Screen-space origin of the current hold; null whenever `collectProgress` is 0. */
  collectOrigin: ScreenPoint | null;
  setArmed(armed: boolean): void;
  setHovered(id: EntityId | null): void;
  setDragging(id: EntityId | null): void;
  setCollectCharge(progress: number, origin: ScreenPoint | null): void;
  reset(): void;
}

export const useInteractionStore = create<InteractionStoreState>()((set) => ({
  armed: false,
  hoveredId: null,
  draggingId: null,
  collectProgress: 0,
  collectOrigin: null,

  setArmed(armed) {
    set({ armed });
  },

  setHovered(id) {
    set((state) => (state.hoveredId === id ? state : { hoveredId: id }));
  },

  setDragging(id) {
    set((state) => (state.draggingId === id ? state : { draggingId: id }));
  },

  setCollectCharge(progress, origin) {
    set((state) => {
      const sameOrigin =
        state.collectOrigin === origin ||
        (state.collectOrigin !== null &&
          origin !== null &&
          state.collectOrigin.x === origin.x &&
          state.collectOrigin.y === origin.y);
      if (state.collectProgress === progress && sameOrigin) return state;
      return { collectProgress: progress, collectOrigin: origin };
    });
  },

  reset() {
    set({ armed: false, hoveredId: null, draggingId: null, collectProgress: 0, collectOrigin: null });
  },
}));
