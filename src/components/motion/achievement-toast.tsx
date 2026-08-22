"use client";

import { motion } from "motion/react";
import { X } from "lucide-react";

import { DURATION, EASE_OUT } from "@/components/motion/variants";
import type { Achievement } from "@/lib/game/quest/quest-types";
import { cn } from "@/lib/utils/cn";

/**
 * One unlocked achievement, as a card.
 *
 * Purely presentational — it knows nothing about the quest store, which keeps
 * it trivial to reason about and lets the queue own every timing decision.
 *
 * Separate from `components/ui/toast.tsx` on purpose: that one is the admin's
 * imperative feedback channel for mutations that succeeded or failed, and this
 * is a reward. Folding a celebratory variant into the admin toast would drag
 * quest concepts into the dashboard for no gain.
 */

interface AchievementToastProps {
  achievement: Achievement;
  onDismiss: () => void;
  reducedMotion: boolean;
  className?: string;
}

export function AchievementToast({
  achievement,
  onDismiss,
  reducedMotion,
  className,
}: AchievementToastProps) {
  const Icon = achievement.icon;

  return (
    <motion.div
      // Enters from the right edge it is pinned to, so the motion reads as the
      // card sliding in from off-screen rather than appearing out of nowhere.
      initial={{ opacity: 0, x: reducedMotion ? 0 : 24, scale: reducedMotion ? 1 : 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{
        opacity: 0,
        x: reducedMotion ? 0 : 24,
        transition: { duration: reducedMotion ? 0.01 : DURATION.fast, ease: EASE_OUT },
      }}
      transition={{ duration: reducedMotion ? 0.01 : DURATION.base, ease: EASE_OUT }}
      className={cn(
        "pointer-events-auto flex w-full max-w-xs items-start gap-3 rounded-card",
        "border border-border bg-surface-raised/95 p-3.5 shadow-floating backdrop-blur-xl",
        className,
      )}
    >
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent-subtle text-accent">
        <Icon className="size-4" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="label-mono text-[10px] text-fg-subtle">Achievement unlocked</p>
        <p className="mt-1 text-sm font-medium text-fg">{achievement.title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{achievement.description}</p>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="-m-1 rounded-md p-1 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <X className="size-3.5" aria-hidden="true" />
        <span className="sr-only">Dismiss achievement</span>
      </button>
    </motion.div>
  );
}
