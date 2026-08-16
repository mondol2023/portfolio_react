"use client";

import { motion, useScroll, useTransform, type UseScrollOptions } from "motion/react";
import { useRef, type ReactNode } from "react";

import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Scroll-linked fade for a whole section.
 *
 * The section rises and fades in as it approaches the middle of the viewport,
 * holds while it is being read, then fades and drifts back out as it leaves —
 * and because the whole thing is driven by scroll position rather than by an
 * enter event, scrolling back up plays it in reverse. That symmetry is the
 * point: a section "hides" the same way it appeared.
 *
 * Four offsets, so the plateau in the middle is explicit:
 *
 *   start end   the section's top touches the bottom of the viewport   → hidden
 *   start 55%   its top has risen past the middle                      → visible
 *   end 45%     its bottom has not yet risen past the middle           → visible
 *   end start   its bottom leaves the top of the viewport              → hidden
 *
 * Those four scroll positions are monotonically increasing for any element
 * height, so the interpolation never inverts on a short section.
 */

// Annotated rather than inferred: hoisting the array out of the `useScroll`
// call loses the contextual type, and a bare `string[]` is not assignable to
// the edge-string union.
const OFFSET: UseScrollOptions["offset"] = ["start end", "start 55%", "end 45%", "end start"];

/** Progress breakpoints matching the four offsets above, spaced evenly. */
const STOPS = [0, 1 / 3, 2 / 3, 1];

interface ScrollVeilProps {
  children: ReactNode;
  className?: string;
  /**
   * Set false for the last section on a page. Its bottom edge never reaches the
   * top of the viewport, so the exit half of the curve would leave it stuck at
   * partial opacity with no way to scroll further and finish it.
   */
  exit?: boolean;
}

export function ScrollVeil({ children, className, exit = true }: ScrollVeilProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useMotionPreference();
  const { scrollYProgress } = useScroll({ target: ref, offset: OFFSET });

  const opacity = useTransform(scrollYProgress, STOPS, [0, 1, 1, exit ? 0 : 1]);
  const y = useTransform(scrollYProgress, STOPS, [32, 0, 0, exit ? -32 : 0]);

  /*
   * The server render has no scroll position, so binding these motion values
   * straight away would ship `opacity: 0` in the HTML — invisible to a reader
   * without JavaScript and to anything that reads the markup. They are applied
   * from the first post-hydration render, by which point `useScroll` has
   * measured for real.
   */
  const animated = useHydrated() && !reducedMotion;

  return (
    <motion.div ref={ref} className={className} style={animated ? { opacity, y } : undefined}>
      {children}
    </motion.div>
  );
}
