/**
 * Frame-loop motion vocabulary for the persistent 3D scene.
 *
 * `variants.ts` owns editorial DOM motion and `springs.ts` owns physical DOM
 * motion; this is the third case neither covers — motion integrated per frame
 * inside `useFrame`, where there is no Motion transition to hand off to and
 * every value has to be advanced by hand against a variable delta.
 *
 * It exists because the same three fragments were being retyped in every
 * object file: `1 - Math.pow(0.001, delta)` as a damping factor, an inline
 * stiffness/damping/mass integrator, and a hand-rolled per-item delay. Naming
 * them once means a section asks for `SCENE_SMOOTHING.glide` rather than
 * re-deriving a magic constant, exactly as `SPRING.snappy` already does for
 * the DOM layer.
 */

import { SPRING, type SpringName } from "./springs";

/**
 * How much of the remaining distance is still left one second later.
 *
 * Smaller is faster. Expressed this way — rather than as a per-frame lerp
 * alpha — because it is frame-rate independent: the same constant settles at
 * the same speed on a 60Hz laptop and a 144Hz monitor.
 */
export const SCENE_SMOOTHING = {
  /** Effectively a cut. Used where reduced motion still has to land somewhere. */
  snap: 1e-9,
  /** Hover and pointer response — arrives well inside the spec's 250–450ms band. */
  tight: 1e-5,
  /** The scene's default follow, and the value every section already used inline. */
  glide: 1e-3,
  /** Scene transitions: deliberately laggy, the spec's 1200–2400ms band. */
  drift: 2e-2,
  /** Camera and other large moves that must never feel snatched. */
  cinematic: 6e-2,
} as const;

export type SceneSmoothing = (typeof SCENE_SMOOTHING)[keyof typeof SCENE_SMOOTHING];

/** The 0–1 blend factor for this frame. Use when lerping something that is not a number. */
export function dampFactor(smoothing: number, delta: number): number {
  return 1 - Math.pow(smoothing, delta);
}

/** Frame-rate-independent exponential approach toward `target`. */
export function damp(current: number, target: number, smoothing: number, delta: number): number {
  return current + (target - current) * dampFactor(smoothing, delta);
}

/**
 * The largest `delta` an integrator may be handed, in seconds.
 *
 * A backgrounded tab or a slow chunk load hands `useFrame` a delta of whole
 * seconds; integrating that teleports whatever it drives.
 */
export const MAX_FRAME_DELTA = 1 / 30;

/** `delta` limited to `MAX_FRAME_DELTA`. Use for anything integrated over time. */
export function clampDelta(delta: number): number {
  return delta < MAX_FRAME_DELTA ? delta : MAX_FRAME_DELTA;
}

export interface SpringState {
  value: number;
  velocity: number;
}

/**
 * One step of a real damped-spring integrator, reusing the DOM layer's named
 * springs so a panel in WebGL settles with the same weight as a panel in the
 * DOM. Mutates `state` and returns its new value.
 */
export function springStep(state: SpringState, target: number, name: SpringName, delta: number): number {
  const { stiffness, damping, mass } = SPRING[name];
  const acceleration = (stiffness * (target - state.value) - damping * state.velocity) / mass;
  state.velocity += acceleration * delta;
  state.value += state.velocity * delta;
  return state.value;
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Confident arrival — the frame-loop twin of `EASE_OUT`'s deceleration. */
export function easeOutCubic(t: number): number {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

/** Sharper still: almost all the distance is covered up front. */
export function easeOutExpo(t: number): number {
  const x = clamp01(t);
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

/** Eases at both ends — for camera spans, which must leave as calmly as they arrive. */
export function easeInOutSine(t: number): number {
  return 0.5 - Math.cos(Math.PI * clamp01(t)) / 2;
}

/**
 * One item's local 0–1 progress inside a staggered sequence.
 *
 * `overlap` is how much of each item's ramp runs concurrently with the next:
 * 0 plays them strictly one after another, 1 plays them together. The ramps
 * are sized so the last item finishes exactly at `progress === 1`, which is
 * what keeps a scroll-scrubbed entrance from completing early and then
 * sitting still for the rest of its span.
 */
export function stagger(progress: number, index: number, count: number, overlap = 0.55): number {
  if (count <= 1) return clamp01(progress);

  const spread = 1 - clamp01(overlap);
  const span = 1 / (1 + (count - 1) * spread);
  const start = index * span * spread;
  return clamp01((progress - start) / span);
}

/**
 * How a world's objects arrive.
 *
 * Declared here and *used* from `scenery.ts` — the same relationship
 * `ScenerySkin` already has with `scene-palette.ts` — so a scenery stays data
 * and the motion vocabulary stays in one file.
 *
 * Phase L Part 4: the four worlds were entering identically. Every Skills
 * variant computed `smoothstep(entry, 0, 1)` from the same line, and three of
 * the four Projects variants ran it through the same
 * `easeOutCubic(stagger(…, 0.5))` — one entrance language wearing four hues,
 * which is the generic "everything fades and moves up" Part 4 rejects by name.
 *
 * Nothing new is integrated here: this only *selects* among the easings above
 * and hands `stagger` its own `overlap` parameter. The four differ along two
 * axes a reader can actually see — whether things arrive together or one after
 * another, and whether that happens early in the approach or across all of it.
 */
export type EntranceId = "settle" | "reveal" | "emerge" | "construct";

interface EntranceLanguage {
  /** Where in the section's `entry` ramp the arrival starts and finishes. */
  from: number;
  to: number;
  /** Shape of one item's own arrival. */
  curve: (t: number) => number;
  /** `stagger`'s overlap: 1 arrives as one body, 0 strictly one after another. */
  overlap: number;
}

const ENTRANCE: Record<EntranceId, EntranceLanguage> = {
  /** Atelier — crafted. Part 4's "soft settle": damp toward rest, short. */
  settle: { from: 0, to: 0.55, curve: easeOutExpo, overlap: 0.62 },
  /** Observatory — discovered. One slow spatial reveal across the whole approach, calm at both ends. */
  reveal: { from: 0, to: 1, curve: easeInOutSine, overlap: 0.95 },
  /** Garden — alive. Unhurried and strictly sequential: each thing grows after the last. */
  emerge: { from: 0.05, to: 0.95, curve: easeOutCubic, overlap: 0.25 },
  /** Blueprint — engineered. A plotter: constant rate, one element at a time, finished early. */
  construct: { from: 0, to: 0.62, curve: clamp01, overlap: 0.1 },
};

/**
 * One item's arrival inside a staggered group, in this world's language.
 *
 * `progress` is the section's raw 0–1 entry progress; the world's own span is
 * applied inside, so a call site never has to know where in the approach its
 * scenery chooses to arrive.
 */
export function entranceStagger(id: EntranceId, progress: number, index: number, count: number): number {
  const language = ENTRANCE[id];
  const span = Math.max(1e-6, language.to - language.from);
  const ramp = clamp01((progress - language.from) / span);
  return language.curve(stagger(ramp, index, count, language.overlap));
}

/** The same arrival for something that enters as one body rather than as a group. */
export function entranceEase(id: EntranceId, progress: number): number {
  return entranceStagger(id, progress, 0, 1);
}
