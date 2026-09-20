/**
 * The scene's frame-synced read of scroll.
 *
 * `use-scene-progress.ts` is still the only story parameter (D7); this is that
 * value after one spring, written once per frame by `<ScrollPhysics>` and read
 * by every `useFrame` in the canvas. A module-scope mutable singleton rather
 * than React state because it changes every frame, and re-rendering the canvas
 * subtree at that rate is what the performance contract forbids.
 */

export interface SceneScroll {
  /** Spring-smoothed story progress, 0–1. What the whole scene animates against. */
  progress: number;
}

export const sceneScroll: SceneScroll = { progress: 0 };
