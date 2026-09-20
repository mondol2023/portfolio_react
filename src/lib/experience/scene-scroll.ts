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
  /** The rail spring's own velocity, progress units per second. Signed. */
  velocity: number;
}

export const sceneScroll: SceneScroll = { progress: 0, velocity: 0 };

/**
 * Above this speed the hover ray stops entirely (§6.2). Frame-loop twin of the
 * DOM's `SCROLL_SUSPEND_VELOCITY` — one gate, each layer in its own units.
 */
export const SCROLL_RAY_SUSPEND = 1;
