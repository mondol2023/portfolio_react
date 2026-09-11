import type { Variants } from "motion/react";

/**
 * Shared motion vocabulary.
 *
 * Every animated surface in the app pulls from these constants so the whole
 * site moves with one personality: short, eased, slightly upward. Components
 * pick a direction and a delay — they do not invent easings.
 *
 * One curve, three speeds. That is the whole vocabulary, and it is
 * deliberately this small: a second easing curve is a second personality, and
 * a reader notices the inconsistency long before they could name it.
 */

/**
 * Custom cubic-bezier: quick to leave, soft to land.
 *
 * Mirrored in `globals.css` as `--ease-site`, which Tailwind's default
 * transition timing function points at — so a CSS hover and a Motion reveal
 * decelerate on the same curve. Change one and change the other.
 */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Three speeds, mapped to the three things motion is doing on this site:
 *
 *   fast   an interaction answering the reader — hover, nav pill, header
 *          hide/show. Wants to feel like a response, not an animation.
 *   base   a structural change — a section revealing, a list arriving.
 *   slow   an atmospheric one — a headline, a masked curtain, a statement.
 *
 * Not every animation should be `base`; flattening the three into one is how
 * a site ends up feeling uniformly sluggish.
 */
export const DURATION = {
  fast: 0.25,
  base: 0.5,
  slow: 0.75,
} as const;

/**
 * Gap between children in a staggered group, in seconds.
 *
 * Kept short on purpose. Stagger is there to say "these arrived together, in
 * order" — stretch it and a six-item list becomes half a second of waiting
 * for content that was ready immediately.
 */
export const STAGGER_STEP = 0.08;

export type MotionDirection = "up" | "down" | "left" | "right" | "none";

const OFFSETS: Record<MotionDirection, { x: number; y: number }> = {
  up: { x: 0, y: 24 },
  down: { x: 0, y: -24 },
  left: { x: 24, y: 0 },
  right: { x: -24, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * Builds the hidden/visible pair for a single element.
 *
 * When `reducedMotion` is true the offsets collapse to zero and the duration
 * shrinks, so the element fades in place instead of travelling.
 */
export function createFadeVariants(
  direction: MotionDirection,
  reducedMotion: boolean,
  distance = 1,
): Variants {
  const offset = OFFSETS[direction] ?? OFFSETS.up;
  const x = reducedMotion ? 0 : offset.x * distance;
  const y = reducedMotion ? 0 : offset.y * distance;

  return {
    hidden: { opacity: 0, x, y },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: reducedMotion ? DURATION.fast : DURATION.base,
        ease: EASE_OUT,
      },
    },
  };
}

/** Parent variant that times its children rather than animating itself. */
export function createStaggerVariants(
  reducedMotion: boolean,
  step = STAGGER_STEP,
  delayChildren = 0,
): Variants {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: reducedMotion ? 0 : step,
        delayChildren: reducedMotion ? 0 : delayChildren,
      },
    },
  };
}

/** Viewport config shared by every scroll-triggered reveal. */
export const VIEWPORT = { once: true, amount: 0.25, margin: "0px 0px -80px 0px" } as const;
