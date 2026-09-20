"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";

import { SPRING } from "@/lib/experience/springs";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Puts a block of type on the same depth rake as the scene behind it.
 *
 * A row is at its own size while it is near the eyeline and recedes slightly
 * as it leaves at either end, so a list of them reads as a corridor of
 * signage the reader is moving through rather than a stack of cards. It is the
 * DOM half of Experience's "typography scale is depth-coupled"; the WebGL half
 * steps its stations back on the same type ratio.
 *
 * Three constraints shaped the numbers. The effect is on *body text*, so the
 * scale range is kept tiny — a transform large enough to be admired is also
 * large enough to re-rasterise type mid-scroll. The transform origin is the
 * left edge, because the rail and its node markers live outside this element
 * and must not drift away from the row they belong to. And a row is bound to
 * raw scroll through a spring for the same reason `<ScrollProgressLine>` is:
 * one trackpad gesture arrives as dozens of tiny deltas.
 *
 * `<DepthScaleList>` owns the one `useScroll` + `useSpring` for the whole
 * list (S14.2); each `<DepthScale>` row is a cheap `useTransform` off that
 * single spring, not a second measured scroll — a list of N rows used to mean
 * N independent integrators, which is exactly the budget S14 caps.
 */

interface DepthScaleListProps {
  children: ReactNode;
  className?: string;
}

/** How far back a row sits at either end of its pass. */
const FAR_SCALE = 0.965;
const FAR_OPACITY = 0.62;
/**
 * The plateau where a row is simply at its own size. Without it a row is only
 * ever full size at one exact scroll position, and nothing is ever *there*.
 */
const RAKE = [0, 0.32, 0.68, 1];

const DepthProgressContext = createContext<MotionValue<number> | null>(null);

export function DepthScaleList({ children, className }: DepthScaleListProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const damped = useSpring(scrollYProgress, SPRING.rail);

  return (
    <div ref={ref} className={className}>
      <DepthProgressContext.Provider value={damped}>{children}</DepthProgressContext.Provider>
    </div>
  );
}

interface DepthScaleProps {
  children: ReactNode;
  className?: string;
  /** This row's 0-based position among the siblings sharing its `<DepthScaleList>`. */
  index: number;
  /** Sibling count — how wide a slice of the list's shared progress this row gets. */
  count: number;
}

export function DepthScale({ children, className, index, count }: DepthScaleProps) {
  const reducedMotion = useMotionPreference();
  // A row rendered outside a `<DepthScaleList>` gets a resting fallback rather
  // than a crash — this can't happen from `experience.tsx` today, but a
  // silent no-op is cheaper to keep correct than a defensive throw.
  const fallback = useMotionValue(0);
  const listProgress = useContext(DepthProgressContext) ?? fallback;

  const local = useTransform(listProgress, (p) => {
    const span = 1 / count;
    return (p - index * span) / span;
  });
  const scale = useTransform(local, RAKE, [FAR_SCALE, 1, 1, FAR_SCALE]);
  const opacity = useTransform(local, RAKE, [FAR_OPACITY, 1, 1, FAR_OPACITY]);

  // Bound only after hydration: on the server the list's `scrollYProgress` is
  // 0, which would ship every row into the HTML already shrunk and dimmed.
  const animated = useHydrated() && !reducedMotion;

  return (
    <motion.div
      className={className}
      style={animated ? { scale, opacity, transformOrigin: "left center" } : undefined}
    >
      {children}
    </motion.div>
  );
}
