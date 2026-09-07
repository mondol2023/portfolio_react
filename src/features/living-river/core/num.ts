/**
 * Small numeric helpers shared by every part of the scene.
 *
 * Deliberately tiny and dependency-free: the render loop calls most of these
 * thousands of times a frame, and the GLSL side has its own copies of the same
 * names (`mix`, `clamp`, `smoothstep`) so the two halves of the scene read
 * alike even though only one of them runs on the GPU.
 */

export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Fraction of the way from `a` to `b`, clamped — the inverse of `lerp`. */
export function inverseLerp(a: number, b: number, value: number): number {
  return a === b ? 0 : clamp01((value - a) / (b - a));
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = inverseLerp(edge0, edge1, value);
  return t * t * (3 - 2 * t);
}

/**
 * Frame-rate independent approach to a target.
 *
 * The naive `current += (target - current) * 0.1` moves twice as far in a
 * frame on a 30fps machine as on a 60fps one, so the same scene feels
 * different on different hardware. This uses the exponential form, where
 * `smoothing` is the fraction of the remaining distance still left after one
 * second — the result is identical at any frame rate.
 */
export function damp(current: number, target: number, smoothing: number, dt: number): number {
  return target + (current - target) * Math.pow(smoothing, dt);
}

/** Signed shortest distance from `a` to `b` around a unit-length loop. */
export function wrapDelta(a: number, b: number): number {
  const d = (b - a) % 1;
  return d > 0.5 ? d - 1 : d < -0.5 ? d + 1 : d;
}

/** `value` folded into `[0, 1)`, negatives included. */
export function fract01(value: number): number {
  return value - Math.floor(value);
}

/** Deterministic pseudo-random in `[0, 1)` from one integer — no global state. */
export function hash1(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453123;
  return x - Math.floor(x);
}
