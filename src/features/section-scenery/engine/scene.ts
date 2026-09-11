import type { PointerState, ScrollState } from "./input";
import type { TonePalette } from "./tone-color";

/**
 * What a scene is handed for one frame.
 *
 * Everything here is measured in CSS pixels — `loop.ts` has already scaled the
 * context by the device pixel ratio, so no primitive ever multiplies by `dpr`
 * or knows what the quality factor currently is. That is the whole reason the
 * loop owns sizing: get it wrong in one primitive and only that primitive is
 * blurry, which is the kind of bug nobody finds.
 *
 * `pointer` and `scroll` are the same objects every frame, mutated in place by
 * the input tracker. Read them, do not store them.
 */
export interface SceneFrame {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  /** Seconds since the previous frame, clamped and lightly smoothed. */
  dt: number;
  /** Seconds since this scene became the current one. */
  t: number;
  /** 0 → 1 over the scene's opening moment, eased. Drives one-shot arrivals. */
  intro: number;
  palette: TonePalette;
  /** Where the reader is looking, smoothed. Falls back to an idle wander, so a
   *  scene may use it unconditionally; scale by `pointer.presence` when the
   *  effect only makes sense as direct manipulation. */
  pointer: PointerState;
  scroll: ScrollState;
}

/**
 * One drawable thing. Primitives and whole scenes share this shape, which is
 * what lets `composeScene` treat a scene as nothing more than a list of
 * primitives — there is no separate "layer" concept to keep in sync.
 */
export interface Scene {
  /** New viewport size in CSS pixels. Always called once before the first frame. */
  resize(width: number, height: number): void;
  /** Advance and paint. Called for every live scene, including one fading out. */
  frame(f: SceneFrame): void;
}

/**
 * A scene is built fresh each time it becomes current rather than cached,
 * because the arrival beat (`intro`) and the randomised placements are the
 * point — a section that keeps its half-finished state from last visit would
 * fade back in mid-gesture.
 */
export type SceneFactory = () => Scene;

export function composeScene(...parts: readonly Scene[]): Scene {
  return {
    resize(width, height) {
      for (const part of parts) part.resize(width, height);
    },
    frame(f) {
      for (const part of parts) part.frame(f);
    },
  };
}
