/**
 * The numeric helpers every other file in the feature leans on.
 *
 * They live apart from `scene.ts` for one concrete reason: `input.ts` needs
 * `approach` and `clamp01`, and `scene.ts` needs `input.ts`'s types. Left in one
 * file that is a cycle. Pure maths has no business importing anything anyway.
 */

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * Frame-rate independent easing toward a target.
 *
 * `current + (target - current) * 0.1` — the usual one-liner — is a different
 * curve at 60Hz than at 144Hz, so a phone and a gaming monitor would disagree
 * about how heavy the scenery feels. The exponential form takes `tau`, the time
 * constant in *seconds* (roughly: 63% of the way there after `tau`), and gives
 * the same motion on any display.
 */
export function approach(current: number, target: number, tau: number, dt: number): number {
  if (tau <= 0) return target;
  return current + (target - current) * (1 - Math.exp(-dt / tau));
}

export function easeOutCubic(t: number): number {
  const p = 1 - clamp01(t);
  return 1 - p * p * p;
}

export function easeInOutSine(t: number): number {
  return 0.5 - Math.cos(Math.PI * clamp01(t)) / 2;
}

/** Eased at both ends, and `smoothstep01(t) + smoothstep01(1 - t) === 1` — which
 *  is what makes it the right curve for a cross-fade. */
export function smoothstep01(t: number): number {
  const p = clamp01(t);
  return p * p * (3 - 2 * p);
}

/** Falls from 1 at the centre to 0 at `radius`, smoothly at both ends. Every
 *  proximity effect in the feature is shaped by this, so the cursor never has a
 *  hard edge where things start or stop reacting to it. */
export function falloff(distance: number, radius: number): number {
  if (radius <= 0) return 0;
  return smoothstep01(1 - clamp01(distance / radius));
}

/** Random float in `[min, max)`. Local rather than imported so scene placement
 *  stays independent of the surprise kit's lifecycle. */
export function between(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
