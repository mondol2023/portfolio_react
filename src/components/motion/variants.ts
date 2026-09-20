import type { Transition, Variants } from "motion/react";

import type { EntranceId } from "@/lib/experience/scene-motion";

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


/**
 * Per-world pace for the site's editorial entrance.
 *
 * The vocabulary above does not change per scenery — every world still fades
 * in over a short travel, because typography is the layer that has to stay
 * stable (Part 2). What changes is the *pace*, so the page reads at the same
 * speed as the canvas behind it rather than at a second, unrelated one: these
 * track each scenery's own `timescale` and the entrance language its 3D
 * objects use (`EntranceId` in `scene-motion.ts`).
 *
 * Phase L Part 4: before this, all four worlds entered on `DURATION.base` +
 * `EASE_OUT` + 24px up — the generic "everything fades and moves up" that
 * collapses four identities into one.
 */
const ENTRANCE_PACE: Record<EntranceId, { duration: number; ease: Transition["ease"]; distance: number }> = {
  /** Atelier — crafted. The site's established pace; unchanged by definition. */
  settle: { duration: DURATION.base, ease: EASE_OUT, distance: 1 },
  /** Observatory — discovered. Slower, further, calm at both ends. */
  reveal: { duration: DURATION.slow, ease: EASE_IN_OUT, distance: 1.25 },
  /** Garden — alive. The slowest world (`timescale: 0.6`); it arrives unhurried. */
  emerge: { duration: DURATION.slow, ease: EASE_OUT, distance: 1.1 },
  /** Blueprint — engineered. Quick, short and linear: placed, not floated in. */
  construct: { duration: DURATION.fast, ease: "linear", distance: 0.6 },
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
  entrance: EntranceId = "settle",
): Variants {
  const pace = ENTRANCE_PACE[entrance];
  const offset = OFFSETS[direction] ?? OFFSETS.up;
  const x = reducedMotion ? 0 : offset.x * distance * pace.distance;
  const y = reducedMotion ? 0 : offset.y * distance * pace.distance;

  return {
    hidden: { opacity: 0, x, y },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: reducedMotion ? DURATION.fast : pace.duration,
        ease: reducedMotion ? EASE_OUT : pace.ease,
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
