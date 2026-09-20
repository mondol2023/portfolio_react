"use client";

import { motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, type ReactNode } from "react";

import { getLocalSectionProgress, subscribeSceneProgress } from "@/lib/experience/use-scene-progress";
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
 * Driven by `getLocalSectionProgress` (S14.1) rather than its own `useScroll`
 * target: the WebGL scene already turns document scroll into one continuous
 * "story progress" number for camera choreography, and this section's veil
 * reads the same number, just re-centred on itself, instead of opening a
 * second scroll-measuring listener next to the scene's.
 *
 * Local progress runs roughly -1 (previous section's eyeline) to 0 (this
 * section's own) to +1 (next section's). Those four breakpoints keep the
 * plateau in the middle explicit, and — because they are symmetric about 0 —
 * the curve never inverts regardless of section height.
 */

/** Local-progress breakpoints the fade is keyed to. */
const RAKE = [-1, -0.35, 0.35, 1];

interface ScrollVeilProps {
  children: ReactNode;
  className?: string;
  /** DOM id of the `<Section>` this veil belongs to — its key into the shared story progress. */
  sectionId: string;
  /**
   * Set false for the last section on a page. Its bottom edge never reaches the
   * top of the viewport, so the exit half of the curve would leave it stuck at
   * partial opacity with no way to scroll further and finish it.
   */
  exit?: boolean;
}

export function ScrollVeil({ children, className, sectionId, exit = true }: ScrollVeilProps) {
  const reducedMotion = useMotionPreference();
  const local = useMotionValue(0);

  useEffect(() => {
    local.set(getLocalSectionProgress(sectionId));
    return subscribeSceneProgress(() => {
      local.set(getLocalSectionProgress(sectionId));
    });
  }, [sectionId, local]);

  const opacity = useTransform(local, RAKE, [0, 1, 1, exit ? 0 : 1]);
  const y = useTransform(local, RAKE, [32, 0, 0, exit ? -32 : 0]);

  /*
   * The server render has no scroll position, so binding these motion values
   * straight away would ship `opacity: 0` in the HTML — invisible to a reader
   * without JavaScript and to anything that reads the markup. They are applied
   * from the first post-hydration render, by which point the effect above has
   * synced to the real story progress.
   */
  const animated = useHydrated() && !reducedMotion;

  return (
    <motion.div className={className} style={animated ? { opacity, y } : undefined}>
      {children}
    </motion.div>
  );
}
