import type { Transition, Variants } from "motion/react";

/**
 * Shared motion vocabulary.
 *
 * Every animated surface in the app pulls from these constants so the whole
 * site moves with one personality: short, eased, slightly upward. Components
 * pick a direction and a delay — they do not invent easings.
 */

/** Custom cubic-bezier: quick to leave, soft to land. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DURATION = {
  fast: 0.25,
  base: 0.5,
  slow: 0.75,
} as const;

/** Gap between children in a staggered group, in seconds. */
export const STAGGER_STEP = 0.08;

export const baseTransition: Transition = {
  duration: DURATION.base,
  ease: EASE_OUT,
};

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
