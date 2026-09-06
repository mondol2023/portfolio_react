"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useRef, type ReactNode } from "react";

import { SPRING } from "@/lib/experience/springs";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * Vertical rail that fills as the reader moves through its children.
 *
 * Used as the spine of the experience timeline: a static hairline in the border
 * colour with a tone-coloured overlay scaled from the top, so the accent tracks
 * how far down the list you have read.
 */

interface ScrollProgressLineProps {
  children: ReactNode;
  className?: string;
  /**
   * Horizontal placement of the rail, as utility classes. Defaults to flush
   * left. Callers whose row markers move between breakpoints pass the same
   * responsive classes here, so the rail and the markers can never drift apart
   * — which is why this is an escape hatch rather than a `left | center` enum.
   */
  railClassName?: string;
}

export function ScrollProgressLine({ children, className, railClassName = "left-0" }: ScrollProgressLineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useMotionPreference();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 65%"] });

  // Smoothing matters here — a rail bound directly to raw scroll reads as jittery
  // on trackpads, where a single gesture arrives as dozens of tiny deltas.
  const scaleY = useSpring(scrollYProgress, SPRING.rail);

  // The rail is bound only after hydration: on the server `scrollYProgress` is
  // 0, which would ship a fully collapsed `scaleY` into the HTML.
  const animated = useHydrated() && !reducedMotion;

  return (
    <div ref={ref} className={cn("relative", className)}>
      <span aria-hidden="true" className={cn("absolute inset-y-0 w-px bg-border", railClassName)} />
      <motion.span
        aria-hidden="true"
        className={cn("absolute inset-y-0 w-px origin-top bg-tone", railClassName)}
        style={animated ? { scaleY } : undefined}
      />
      {children}
    </div>
  );
}
