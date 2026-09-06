"use client";

import type { ReactNode } from "react";

import { useGameActive } from "./game-provider";
import { CollectFlyoff } from "./collect-flyoff";
import { CollectRing } from "./collect-ring";
import { GameHUD } from "./game-hud";

/**
 * HTML overlay root for the world — score chip, hints, transient notices.
 *
 * Fixed and full-viewport but `pointer-events: none` with the HUD opting back
 * in, so the overlay can never swallow a click meant for the portfolio. Lives
 * at z-30: above content, below the host's existing HUD (z-40) and toasts
 * (z-100), so the two systems never fight for the same pixel.
 */
export function GameOverlay({ children }: { children?: ReactNode }) {
  const active = useGameActive();

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {children}
      <CollectRing />
      <CollectFlyoff />
      <GameHUD />
    </div>
  );
}
