"use client";

import { AnimatePresence, motion } from "motion/react";

import type { SectionTone } from "@/lib/constants/section-tone";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

import { WALLPAPERS } from "./wallpapers";

/**
 * The desktop's background picture.
 *
 * Sits at `-z-[11]`, one layer *below* `.ambient` — the drifting blobs that were
 * already there keep drifting, now over a wallpaper instead of over flat paint.
 *
 * Both theme variants of a wallpaper are always in the DOM, stacked, and it is
 * the `dark:` opacity utility that picks between them. Reading the theme in
 * JavaScript would mean rendering the wrong one for a frame on every load, which
 * is very visible when the thing being swapped is a full-screen gradient.
 *
 * The crossfade between *sections* is a different job and does run in JS, since
 * `background-image` is not an animatable property: `AnimatePresence` keeps the
 * outgoing wallpaper mounted and fades the incoming one over the top of it.
 */

export function WallpaperField({ tone }: { tone: SectionTone }) {
  const reducedMotion = useMotionPreference();
  const wallpaper = WALLPAPERS[tone];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-[11] overflow-hidden"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={tone}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0.01 : 0.7, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <div
            className="absolute inset-0 opacity-100 dark:opacity-0"
            style={wallpaper.light}
          />
          <div
            className="absolute inset-0 opacity-0 dark:opacity-100"
            style={wallpaper.dark}
          />
        </motion.div>
      </AnimatePresence>

      {/* Constant across every wallpaper: the faint grid is what makes all six
          read as the same machine rather than six unrelated pictures. */}
      <div className="surface-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(85%_75%_at_50%_45%,black,transparent)]" />
    </div>
  );
}
