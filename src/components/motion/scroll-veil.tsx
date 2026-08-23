"use client";

import { motion, useScroll, useTransform, type UseScrollOptions } from "motion/react";
import { useRef, type ReactNode } from "react";

import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Scroll-linked transition for a whole section.
 *
 * The section arrives as it approaches the middle of the viewport, holds while
 * it is being read, then leaves as it passes — and because the whole thing is
 * driven by scroll position rather than by an enter event, scrolling back up
 * plays it in reverse. That symmetry is the point: a section "hides" the same
 * way it appeared.
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
 *
 * `variant` is what stops the page from being six identical fade-ups. Each
 * section gets its own way of entering, chosen in `Section` from its tone, so
 * the transition carries some of the section's character instead of being the
 * same tax paid six times.
 *
 * Every variant moves along transform channels that cannot widen the element:
 * `y`, `scale` and `rotateX`. Horizontal travel is deliberately absent — the
 * document has no `overflow-x` clamp, so a section sliding in from the side
 * would hand the whole page a horizontal scrollbar for the duration.
 */

// Annotated rather than inferred: hoisting the array out of the `useScroll`
// call loses the contextual type, and a bare `string[]` is not assignable to
// the edge-string union.
const OFFSET: UseScrollOptions["offset"] = ["start end", "start 55%", "end 45%", "end start"];

/** Progress breakpoints matching the four offsets above, spaced evenly. */
const STOPS = [0, 1 / 3, 2 / 3, 1];

export type VeilVariant = "fade" | "rise" | "expand" | "tilt" | "settle" | "zoom";

/** `[entering, leaving]` for each channel; the two held stops are always rest. */
interface VeilShape {
  y: [number, number];
  scale: [number, number];
  rotateX: [number, number];
}

const SHAPES: Record<VeilVariant, VeilShape> = {
  /** Opacity alone — for a section that already has an entrance of its own. */
  fade: { y: [0, 0], scale: [1, 1], rotateX: [0, 0] },
  /** The plain one: up from below, out through the top. */
  rise: { y: [32, -32], scale: [1, 1], rotateX: [0, 0] },
  /** Opens outward from slightly too small. */
  expand: { y: [16, -16], scale: [0.94, 0.97], rotateX: [0, 0] },
  /** Hinges up off its own bottom edge, then away over the top. */
  tilt: { y: [28, -24], scale: [1, 1], rotateX: [7, -5] },
  /** Comes down from above rather than up from below. */
  settle: { y: [-36, -24], scale: [1, 1], rotateX: [0, 0] },
  /** Arrives slightly too close and settles back. */
  zoom: { y: [12, -12], scale: [1.04, 0.98], rotateX: [0, 0] },
};

interface ScrollVeilProps {
  children: ReactNode;
  className?: string;
  /**
   * Set false for the last section on a page. Its bottom edge never reaches the
   * top of the viewport, so the exit half of the curve would leave it stuck at
   * partial opacity with no way to scroll further and finish it.
   */
  exit?: boolean;
  variant?: VeilVariant;
}

export function ScrollVeil({
  children,
  className,
  exit = true,
  variant = "rise",
}: ScrollVeilProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useMotionPreference();
  const { scrollYProgress } = useScroll({ target: ref, offset: OFFSET });

  const shape = SHAPES[variant];
  // `exit === false` collapses every leaving value back to rest, so the curve
  // simply plateaus instead of running a half-transition it can never finish.
  const rest = <T,>(value: T, fallback: T) => (exit ? value : fallback);

  const opacity = useTransform(scrollYProgress, STOPS, [0, 1, 1, rest(0, 1)]);
  const y = useTransform(scrollYProgress, STOPS, [shape.y[0], 0, 0, rest(shape.y[1], 0)]);
  const scale = useTransform(scrollYProgress, STOPS, [
    shape.scale[0],
    1,
    1,
    rest(shape.scale[1], 1),
  ]);
  const rotateX = useTransform(scrollYProgress, STOPS, [
    shape.rotateX[0],
    0,
    0,
    rest(shape.rotateX[1], 0),
  ]);

  /*
   * The server render has no scroll position, so binding these motion values
   * straight away would ship `opacity: 0` in the HTML — invisible to a reader
   * without JavaScript and to anything that reads the markup. They are applied
   * from the first post-hydration render, by which point `useScroll` has
   * measured for real.
   */
  const animated = useHydrated() && !reducedMotion;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={
        animated
          ? {
              opacity,
              y,
              scale,
              rotateX,
              // Only meaningful for `tilt`, and inert at 0deg for the rest, so
              // it is set unconditionally rather than branched per variant.
              transformPerspective: 1400,
            }
          : undefined
      }
    >
      {children}
    </motion.div>
  );
}
