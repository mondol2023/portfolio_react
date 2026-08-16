"use client";

import { motion } from "motion/react";
import type { ElementType } from "react";

/**
 * `motion.create()` builds a brand new component type on every call. Calling it
 * during render would give React a different type each pass and remount the
 * subtree, so results are memoised here at module scope and shared across all
 * motion primitives.
 */

type MotionComponent = ReturnType<typeof motion.create<"div">>;

const cache = new Map<ElementType, MotionComponent>();

export function motionElement(as: ElementType): MotionComponent {
  const cached = cache.get(as);
  if (cached) return cached;

  // The cast pins a single prop signature; the primitives only ever pass
  // props that are valid on any host element (className, style, children).
  const created = motion.create(as as "div");
  cache.set(as, created);
  return created;
}
