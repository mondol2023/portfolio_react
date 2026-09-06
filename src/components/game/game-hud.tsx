"use client";

import { motion } from "motion/react";

import { DURATION, EASE_OUT } from "@/components/motion/variants";
import { QUEST_LABELS } from "@/lib/game/game-config";
import { explorerProgress } from "@/lib/game/xp";
import { SECTION_IDS } from "@/lib/constants/navigation";
import { useActiveSection } from "@/lib/hooks/use-active-section";
import { useGameProgress } from "@/lib/hooks/use-game-progress";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Slim floating HUD — level, XP bar, current quest — shown only in Game
 * Mode. Normal Mode stays exactly as it was: nothing here renders, mounts a
 * listener, or costs a byte, when `mode !== "game"`.
 *
 * Bottom-left, deliberately: the toast viewport already owns the bottom-right
 * (see `ToastProvider`), and the header owns the top. `hidden sm:block`
 * keeps it off phones, where screen space belongs to the content it is
 * merely a companion to.
 */
export function GameHUD() {
  const progress = useGameProgress();
  const activeSection = useActiveSection(SECTION_IDS);
  const reducedMotion = useMotionPreference();

  if (progress.mode !== "game") return null;

  const level = explorerProgress(progress.xp);
  const quest = QUEST_LABELS[activeSection ?? "home"] ?? QUEST_LABELS.home;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0.01 : DURATION.fast, ease: EASE_OUT }}
      className="pointer-events-none fixed bottom-4 left-4 z-40 hidden w-56 rounded-card border border-border bg-surface/90 p-3 text-xs shadow-floating backdrop-blur-xl sm:block"
    >
      <div className="flex items-center justify-between">
        <span className="label-mono">LVL {level.level}</span>
        <span className="text-fg-subtle">{progress.xp} XP</span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={false}
          animate={{ width: `${level.progress * 100}%` }}
          transition={{ duration: reducedMotion ? 0 : DURATION.base, ease: EASE_OUT }}
        />
      </div>

      <p className="mt-2 truncate text-fg-muted">
        <span className="text-fg-subtle">Current quest — </span>
        {quest}
      </p>
    </motion.div>
  );
}
