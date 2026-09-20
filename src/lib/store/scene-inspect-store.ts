import { create } from "zustand";

/**
 * Inspect mode (§6.3, Phase G): a free-orbit camera state entered from a
 * raised plan sheet in `blueprint`. Rare, boolean, id-shaped intent — the
 * same reason `scene-scenery-store.ts` is a store rather than a module
 * singleton like `scene-pointer.ts`. `CameraRig` reads `active` via
 * `getState()` inside `useFrame`; DOM effects (`inspect-mode-effects.tsx`)
 * subscribe to it directly, since entering/exiting has to freeze scroll, dim
 * the page and flip the canvas's `pointer-events`.
 */
interface SceneInspectState {
  active: boolean;
  enter(): void;
  exit(): void;
}

export const useSceneInspectStore = create<SceneInspectState>()((set) => ({
  active: false,
  enter: () => set({ active: true }),
  exit: () => set({ active: false }),
}));
