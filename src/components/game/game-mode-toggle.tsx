"use client";

import { Gamepad2 } from "lucide-react";

import { useGameProgress } from "@/lib/hooks/use-game-progress";
import { gameStore } from "@/lib/store/game-store";
import { cn } from "@/lib/utils/cn";

/**
 * Normal Mode / Game Mode switch.
 *
 * Flips one field in the shared store — nothing about Normal Mode's markup or
 * data changes when Game Mode is off, and nothing here re-renders anything
 * beyond the components that read `useGameProgress()`. The heavier additions
 * (the HUD now, a future interactive layer) gate themselves on `mode ===
 * "game"` the same way this button sets it.
 */
export function GameModeToggle({ className }: { className?: string }) {
  const { mode } = useGameProgress();
  const isGame = mode === "game";

  return (
    <button
      type="button"
      onClick={() => gameStore.setMode(isGame ? "normal" : "game")}
      aria-pressed={isGame}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        isGame
          ? "border-accent/40 bg-accent/10 text-accent"
          : "border-border text-fg-muted hover:border-border-strong hover:text-fg",
        className,
      )}
    >
      <Gamepad2 className="size-3.5" aria-hidden="true" />
      {isGame ? "Game mode" : "Normal mode"}
    </button>
  );
}
