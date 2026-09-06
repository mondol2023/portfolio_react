/**
 * Small, dependency-free math helpers shared by systems and entities.
 *
 * Kept inline-tiny: anything the render loop calls runs millions of times per
 * session, so these are plain functions with no allocation.
 */

export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

/**
 * Frame-rate independent exponential smoothing.
 *
 * `lambda` is the *rate*: higher converges faster. Unlike a fixed-per-frame
 * `lerp(from, to, 0.05)`, the result does not change when the frame rate does —
 * the difference between a camera that feels the same at 30 and 144 Hz.
 */
export function damp(from: number, to: number, lambda: number, deltaSeconds: number): number {
  return lerp(from, to, 1 - Math.exp(-lambda * deltaSeconds));
}

/** Linear remap, clamped to the output range so overshoot stays sane. */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax - inMin === 0) return outMin;
  const alpha = clamp((value - inMin) / (inMax - inMin), 0, 1);
  return lerp(outMin, outMax, alpha);
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp((value - edge0) / (edge1 - edge0 || 1), 0, 1);
  return t * t * (3 - 2 * t);
}
