"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

import { EASE_OUT, DURATION } from "./variants";

/**
 * Global motion defaults.
 *
 * `reducedMotion="user"` is the library-level safety net: even a component that
 * forgets to check `useMotionPreference` will have its transforms neutralised
 * when the OS asks for reduced motion.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: DURATION.base, ease: EASE_OUT }}>
      {children}
    </MotionConfig>
  );
}
