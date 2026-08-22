"use client";

import { AnimatePresence } from "motion/react";
import { useEffect } from "react";

import { AchievementToast } from "@/components/motion/achievement-toast";
import { ACHIEVEMENTS, ACHIEVEMENT_TOAST_MS } from "@/lib/game/quest/quest-constants";
import { useQuest } from "@/lib/game/quest/use-quest";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Drains unlocked-but-unseen achievements, one card at a time.
 *
 * One at a time rather than a stack: two achievements can unlock on the same
 * action — reaching contact both completes the section sweep and reaches the
 * final level — and a column of cards appearing at once is the "blocking,
 * annoying" failure mode the brief rules out. The second waits its turn.
 *
 * The container never takes pointer events; only the card inside it does. A
 * visitor reaching for a nav link while a toast is up hits the link.
 */
export function AchievementQueue() {
  const { pendingAchievements, dismissAchievement } = useQuest();
  const reducedMotion = useMotionPreference();

  const currentId = pendingAchievements[0] ?? null;

  useEffect(() => {
    if (!currentId) return;

    const timer = setTimeout(() => dismissAchievement(currentId), ACHIEVEMENT_TOAST_MS);
    return () => clearTimeout(timer);
  }, [currentId, dismissAchievement]);

  const achievement = currentId ? ACHIEVEMENTS[currentId] : null;

  return (
    <div
      // Top-right. The whole bottom edge belongs to the taskbar and the two
      // buttons sitting above it, and the top-left corner is the shortcut dock.
      className="pointer-events-none fixed inset-x-4 top-20 z-60 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6"
      role="region"
      aria-label="Achievements"
      aria-live="polite"
    >
      <AnimatePresence mode="wait" initial={false}>
        {achievement ? (
          <AchievementToast
            key={achievement.id}
            achievement={achievement}
            reducedMotion={reducedMotion}
            onDismiss={() => dismissAchievement(achievement.id)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
