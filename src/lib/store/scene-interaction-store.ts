import { create } from "zustand";

/**
 * DOM → scene hand-off for pointer intent (Act II, D1).
 *
 * The canvas is `pointer-events-none` and must stay that way (it sits behind
 * content at `z-index: -8`), so it can never raycast its own hover state. A
 * DOM element owns the real hover — a skill chip, a project card — and writes
 * its id here; the scene reads it back inside `useFrame` via `getState()`,
 * never a React subscription, so a hover never triggers a scene re-render.
 *
 * Id-shaped intent only. Continuous per-frame values (pointer position, press
 * state) live in module-scope singletons instead — `scene-pointer.ts` — since
 * a store write per frame is a store write too many.
 *
 * Same shape as `scene-content-store.ts`: one zustand store as the seam
 * between a React tree the layout can't cross and a frame loop that must
 * never re-render.
 */
interface SceneInteractionState {
  hoveredSkillId: string | null;
  hoveredProjectId: string | null;
  setHoveredSkillId(id: string | null): void;
  setHoveredProjectId(id: string | null): void;
}

export const useSceneInteractionStore = create<SceneInteractionState>()((set) => ({
  hoveredSkillId: null,
  hoveredProjectId: null,
  setHoveredSkillId: (hoveredSkillId) => set({ hoveredSkillId }),
  setHoveredProjectId: (hoveredProjectId) => set({ hoveredProjectId }),
}));

/**
 * Cached once: `matchMedia` allocates a list object per call, and these run on
 * every pointer enter. Re-read live (`.matches`) so plugging in a mouse still
 * counts.
 */
const finePointerQuery =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(pointer: fine) and (hover: hover)")
    : null;

/**
 * DOM-side writers for skill hover. Handlers call these instead of the setter
 * so nothing subscribes — a hover moves the scene without re-rendering a page
 * that has ~30 pills on it.
 *
 * Touch is excluded at the source rather than in the scene: a tap is not a
 * hover, and `pointerenter` fires on one.
 */
export function publishHoveredSkill(id: string): void {
  if (!finePointerQuery?.matches) return;
  useSceneInteractionStore.getState().setHoveredSkillId(id);
}

/**
 * Only clears if `id` is still the hovered one — moving between two pills
 * fires the new pill's enter before the old pill's leave.
 */
export function clearHoveredSkill(id: string): void {
  const state = useSceneInteractionStore.getState();
  if (state.hoveredSkillId === id) state.setHoveredSkillId(null);
}

/**
 * The same pair for project cards (Phase L Part 6). `hoveredProjectId` was
 * declared in Phase J and had no writer until now: every Projects variant
 * picked its own reaction off a screen-space ray, against slabs that live in
 * the page gutters while the cards live in the content column — so hovering a
 * card lit nothing, and the canvas lit up only once the cursor had left the
 * content entirely. Two layers sharing a scroll position and nothing else.
 *
 * Same fine-pointer gate and same last-writer-wins clear as the skill pair
 * above, for the same reasons.
 */
export function publishHoveredProject(id: string): void {
  if (!finePointerQuery?.matches) return;
  useSceneInteractionStore.getState().setHoveredProjectId(id);
}

export function clearHoveredProject(id: string): void {
  const state = useSceneInteractionStore.getState();
  if (state.hoveredProjectId === id) state.setHoveredProjectId(null);
}
