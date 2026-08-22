"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { EASE_OUT } from "@/components/motion/variants";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import type { PlayerLevel } from "@/lib/utils/career";

import { StatCounter } from "./stat-counter";

/**
 * LEVEL and the XP bar.
 *
 * Both numbers come from `playerLevel` — years since the first role, and how far
 * through the current year — so the HUD is reporting the work history rather
 * than decorating it.
 *
 * The bar is a `scaleX` on a child, not an animated `width`. Width is a layout
 * property: animating it re-runs layout for the whole panel every frame, and on
 * the About pane that panel contains the statistics grid. A transform is
 * composited and touches nothing around it.
 */

const FILL_DURATION = 1.4;

export function LevelMeter({ level }: { level: PlayerLevel }) {
  const reducedMotion = useMotionPreference();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  const percent = Math.round(level.progress * 100);

  return (
    <div ref={ref}>
      <div className="flex items-end justify-between gap-4">
        <p className="flex items-baseline gap-2">
          <span className="label-mono text-fg-subtle">Level</span>
          <StatCounter
            value={String(level.level)}
            className="text-3xl font-semibold text-fg tabular-nums"
          />
        </p>
        <p className="label-mono text-fg-subtle">
          Active since {level.startYear}
        </p>
      </div>

      <div
        role="progressbar"
        aria-label="Progress through the current year"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"
      >
        <motion.div
          initial={{ scaleX: 0 }}
          animate={inView ? { scaleX: level.progress } : { scaleX: 0 }}
          transition={{ duration: reducedMotion ? 0 : FILL_DURATION, ease: EASE_OUT }}
          // The transform must grow from the left edge, not from the centre.
          style={{ transformOrigin: "left" }}
          className="h-full w-full rounded-full bg-tone"
        />
      </div>

      <p className="label-mono mt-2 text-fg-subtle">{percent}% toward the next</p>
    </div>
  );
}
