"use client";

import { useEffect, useRef } from "react";

import { useToast } from "@/components/ui/toast";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { useActiveSection } from "@/lib/hooks/use-active-section";
import { useGameProgress } from "@/lib/hooks/use-game-progress";
import { SECTION_IDS } from "@/lib/constants/navigation";
import { gameStore } from "@/lib/store/game-store";
import type { AchievementId } from "@/lib/types/game";

/**
 * Invisible watcher, mounted once in the public shell.
 *
 * Two jobs: marks a section "discovered" the moment the scroll-spy already
 * used by the nav (`useActiveSection`) says it's active — no second
 * `IntersectionObserver` — and turns a freshly-unlocked achievement into a
 * toast via the existing `ToastProvider`.
 *
 * Achievements already unlocked on a *previous* visit are restored from
 * `localStorage` by the store, and must never re-announce themselves on
 * every reload — so the "already seen" set is seeded from the first
 * snapshot rather than starting empty.
 */
export function GameProgressTracker() {
  const activeSection = useActiveSection(SECTION_IDS);
  const progress = useGameProgress();
  const { toast } = useToast();
  const announced = useRef<Set<AchievementId> | null>(null);

  useEffect(() => {
    if (activeSection) gameStore.discoverSection(activeSection);
  }, [activeSection]);

  useEffect(() => {
    if (announced.current === null) {
      announced.current = new Set(progress.unlockedAchievements);
      return;
    }

    for (const id of progress.unlockedAchievements) {
      if (announced.current.has(id)) continue;
      announced.current.add(id);

      const achievement = ACHIEVEMENTS[id];
      toast({
        variant: "achievement",
        title: `Achievement unlocked: ${achievement.title}`,
        description: achievement.description,
      });
    }
  }, [progress.unlockedAchievements, toast]);

  return null;
}
