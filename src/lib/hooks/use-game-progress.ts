"use client";

import { useSyncExternalStore } from "react";

import { gameStore } from "@/lib/store/game-store";
import type { GameProgressState } from "@/lib/types/game";

/**
 * Read-only view of the exploration store, re-rendering only the components
 * that ask for it. Mutations go through `gameStore` directly (`.setMode`,
 * `.discoverSection`, ...) — plain imported functions, not hook-wrapped,
 * since they need no render of their own to run.
 */
export function useGameProgress(): GameProgressState {
  return useSyncExternalStore(gameStore.subscribe, gameStore.getSnapshot, gameStore.getServerSnapshot);
}
