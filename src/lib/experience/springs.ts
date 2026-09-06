import type { Transition } from "motion/react";

/**
 * Spring vocabulary for the interactive layer.
 *
 * `variants.ts` owns the site's *editorial* motion — short, eased, slightly
 * upward. This file owns the *physical* motion: cursors, magnetic buttons,
 * panels that overshoot. They are kept apart because they answer different
 * questions. A duration-and-easing curve describes how long a reveal takes; a
 * spring describes how heavy a thing feels when you push it.
 *
 * Every spring here is named for the feel it produces, not for its numbers, so
 * a component asks for `SPRING.snappy` rather than re-deriving stiffness at the
 * call site. That is what keeps the whole experience moving with one hand.
 */

export const SPRING = {
  /** Cursor and pointer followers — near-instant, no visible overshoot. */
  cursor: { stiffness: 900, damping: 45, mass: 0.35 },
  /** Trailing ring behind the cursor dot — visibly lags, then settles. */
  trail: { stiffness: 250, damping: 22, mass: 0.6 },
  /** Buttons and magnetic pulls — tight with a hint of bounce. */
  snappy: { stiffness: 420, damping: 28, mass: 0.8 },
  /** Panels and cards sliding into place — weightier, confident. */
  panel: { stiffness: 180, damping: 24, mass: 1 },
  /** Scroll-bound rails — heavily damped so trackpad deltas do not jitter. */
  rail: { stiffness: 130, damping: 30, mass: 0.4 },
  /** Camera and large scene moves — slow, cinematic, never bouncy. */
  camera: { stiffness: 90, damping: 26, mass: 1.2 },
} as const satisfies Record<string, { stiffness: number; damping: number; mass: number }>;

export type SpringName = keyof typeof SPRING;

/** Motion `Transition` form of a named spring, for `animate` props. */
export function spring(name: SpringName): Transition {
  return { type: "spring", ...SPRING[name] };
}

/**
 * Collapses a spring to an instant cut when the visitor asks for reduced
 * motion. Returning a zero-duration tween rather than `undefined` means the
 * property still animates through Motion's pipeline — it just arrives at once,
 * which keeps `onAnimationComplete` callbacks firing as callers expect.
 */
export function springOrCut(name: SpringName, reducedMotion: boolean): Transition {
  return reducedMotion ? { duration: 0 } : spring(name);
}

/** Glitch/scramble timing, shared by the loader, nav and section headings. */
export const GLITCH = {
  /** Seconds a character spends scrambling before it locks to its final glyph. */
  charDuration: 0.045,
  /** Scramble passes per character. More reads as heavier corruption. */
  passes: 3,
  /** Character pool the scramble draws from. */
  charset: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/<>[]{}=+*#%&_",
} as const;
