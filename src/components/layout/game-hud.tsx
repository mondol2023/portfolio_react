"use client";

import { AnimatePresence, motion } from "motion/react";

import { DURATION, EASE_OUT } from "@/components/motion/variants";
import { useQuestProgress } from "@/lib/game/quest/use-quest";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * The quest readout in the header.
 *
 * Deliberately quiet. The brief asks for a game HUD, but this site's own voice
 * is restrained — the sections are already numbered `01 — About`, `03 — Work`
 * — so an arcade bar with a glowing counter would read as a different site
 * bolted on. What ships is a pill the size of a nav link: the level the visitor
 * has reached, its name, and a hairline that fills as they explore.
 *
 * Desktop only. On a phone the header is already a wordmark and a menu button,
 * and a third element there costs more than the progression is worth.
 *
 * Renders nothing until hydration: the level comes from session storage, which
 * the server cannot see, so drawing it during SSR would be a mismatch.
 */

/** Width of the XP hairline, in pixels — small enough to read as punctuation. */
const TRACK_WIDTH = 48;

export function GameHud() {
  const hydrated = useHydrated();
  const reducedMotion = useMotionPreference();
  const { level, maxLevel, label, percent, ratio } = useQuestProgress();

  if (!hydrated) return null;

  const duration = reducedMotion ? 0.01 : DURATION.base;

  return (
    <div
      className="hidden items-center gap-2.5 rounded-full border border-border/60 bg-surface/50 py-1 pr-3 pl-2.5 lg:flex"
      // One label for the whole pill: a screen reader should hear the progress
      // as a sentence, not as three orphaned fragments.
      role="status"
      aria-label={`Level ${level} of ${maxLevel}, ${label}. Portfolio explored: ${percent} percent.`}
    >
      <span className="label-mono text-[10px] text-fg-subtle" aria-hidden="true">
        LVL {level}
      </span>

      {/* Fixed width so the header's layout does not shuffle every time the
          scroll-spy moves to a section whose label is a character longer. */}
      <span className="relative h-4 w-24 overflow-hidden" aria-hidden="true">
        <AnimatePresence initial={false} mode="wait">
          <motion.span
            key={label}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
            transition={{ duration: reducedMotion ? 0.01 : DURATION.fast, ease: EASE_OUT }}
            className="absolute inset-0 truncate text-xs leading-4 text-fg-muted"
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </span>

      {/* scaleX rather than width: the perf rule in the brief is transform and
          opacity only, and a solid fill scales without artefacts. */}
      <span
        className="h-px overflow-hidden rounded-full bg-border-strong"
        style={{ width: TRACK_WIDTH }}
        aria-hidden="true"
      >
        <motion.span
          className="block h-full w-full origin-left bg-accent"
          initial={false}
          animate={{ scaleX: ratio }}
          transition={{ duration, ease: EASE_OUT }}
        />
      </span>
    </div>
  );
}
