import { create } from "zustand";

/**
 * Camera intent, written imperatively and read imperatively — no subscriber
 * ever re-renders for it.
 *
 * `scrollProgress` (0..1) is written by the camera controller once per frame
 * straight from the document's scroll position and consumed in the same frame
 * by the rig, so it never needs to be React state at all.
 */
interface CameraStoreState {
  scrollProgress: number;
  /** Reserved for Phase 5's GSAP focus transitions: which world anchor to face. */
  focusAnchor: string | null;
  setScrollProgress(progress: number): void;
  setFocusAnchor(anchor: string | null): void;
}

export const useCameraStore = create<CameraStoreState>()((set) => ({
  scrollProgress: 0,
  focusAnchor: null,

  setScrollProgress(progress) {
    set({ scrollProgress: Math.min(1, Math.max(0, progress)) });
  },

  setFocusAnchor(anchor) {
    set((state) => (state.focusAnchor === anchor ? state : { focusAnchor: anchor }));
  },
}));
