import { Timer } from "three";

/**
 * The scene's one shared clock (S6), replacing six independent
 * `state.clock.elapsedTime` reads scattered across `src/three`.
 *
 * A module-scope mutable singleton, mirroring `scene-scroll.ts`: ticked once
 * per frame by `<ScrollPhysics>` (already the first child, already the
 * ordering authority) and read by every other `useFrame` in the canvas
 * without re-subscribing to anything. `connect(document)` means a
 * backgrounded tab stops accumulating elapsed time instead of jumping
 * forward when it regains focus.
 */
export interface SceneTime {
  /** Seconds since the timer connected, scaled by the active scenery's timescale. */
  elapsed: number;
  /** This frame's delta in seconds, scaled the same way. */
  delta: number;
}

export const sceneTime: SceneTime = { elapsed: 0, delta: 0 };

const timer = new Timer();
timer.connect(document);

/** Called once per frame by `<ScrollPhysics>`. */
export function tickSceneTimer(): void {
  timer.update();
  sceneTime.delta = timer.getDelta();
  sceneTime.elapsed = timer.getElapsed();
}

/** A scenery's pace lever (S6) — e.g. `garden` breathing slower than `blueprint`. */
export function setSceneTimescale(timescale: number): void {
  timer.setTimescale(timescale);
}
