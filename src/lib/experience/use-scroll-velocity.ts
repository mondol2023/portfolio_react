"use client";

import { useVelocity, useScroll, useSpring, useTransform, useMotionValue, type MotionValue } from "motion/react";
import { useEffect } from "react";

import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Smoothed, sign-agnostic scroll speed for a scrollable element (or the
 * window when no `target` is given), normalised to roughly 0..1 for typical
 * wheel/trackpad scrolling — fast flicks can exceed 1, which callers should
 * clamp for themselves if they need a hard ceiling.
 *
 * Intended for autonomous visual feedback (e.g. particles accelerating with
 * scroll speed) rather than layout — it's a motion value, not React state, so
 * reading it doesn't re-render.
 *
 * Under reduced motion the value is held at 0 so anything driven by it (a
 * particle stream, a camera dolly) reads as calm rather than merely slower.
 */
/**
 * Above this normalised velocity, pointer-driven motion suspends rather than
 * keeps integrating through a fast scroll. One gate, one threshold constant
 * (§10): card tilt reads it here (S14.3), the cursor aura and raycaster read
 * the same constant in later phases.
 */
export const SCROLL_SUSPEND_VELOCITY = 0.5;

export function useScrollVelocity(target?: React.RefObject<HTMLElement | null>): MotionValue<number> {
  const reducedMotion = useMotionPreference();
  const { scrollYProgress } = useScroll(target ? { target, offset: ["start end", "end start"] } : undefined);
  const rawVelocity = useVelocity(scrollYProgress);
  // Progress-based velocity is unitless per second; this divisor is tuned so
  // an ordinary scroll gesture lands near 1, not so a physical unit is meaningful.
  const normalised = useTransform(rawVelocity, (v) => Math.min(Math.abs(v) / 2, 3));
  const smoothed = useSpring(normalised, { stiffness: 90, damping: 20, mass: 0.5 });

  const still = useMotionValue(0);

  useEffect(() => {
    if (!reducedMotion) return;
    // Snap (not animate) to zero — reduced motion should read as held still.
    smoothed.jump(0);
  }, [reducedMotion, smoothed]);

  return reducedMotion ? still : smoothed;
}
