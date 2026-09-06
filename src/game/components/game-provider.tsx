"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

import { gameBus } from "../events/game-bus";

import { DEFAULT_GAME_SETTINGS } from "../config/game-config";
import type { GameEvent, GameSettings } from "../types/game";

/**
 * The world's React root — and the whole integration surface the host app
 * touches. It owns three things:
 *
 * 1. **Activation.** `active` is the host's decision (the portfolio passes
 *    its Game Mode flag). When false, everything the provider gates renders
 *    nothing and no WebGL context exists.
 * 2. **Settings.** Host overrides merged over the module defaults.
 * 3. **The event bridge.** `onEvent` receives every `GameEvent` the world
 *    emits — the single hook-in point for mirroring world progress into the
 *    host's own UI.
 *
 * The provider itself never touches three.js; it is safe to mount anywhere.
 */
export interface GameProviderProps {
  /** Whether the world should exist right now (the host's Game Mode). */
  active: boolean;
  /** Overrides merged over `DEFAULT_GAME_SETTINGS`. Pass a stable reference. */
  settings?: Partial<GameSettings>;
  /** Mirror of every world event, for the host's own UI. */
  onEvent?: (event: GameEvent) => void;
  children?: ReactNode;
}

interface GameContextValue {
  settings: GameSettings;
  active: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ active, settings, onEvent, children }: GameProviderProps) {
  const value = useMemo<GameContextValue>(
    () => ({ settings: { ...DEFAULT_GAME_SETTINGS, ...settings }, active }),
    [active, settings],
  );

  useEffect(() => (onEvent ? gameBus.on(onEvent) : undefined), [onEvent]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

/** Internal accessor — every module-scoped hook below reads through this. */
export function useGameContext(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) {
    throw new Error("[game] GameProvider is missing above this component");
  }
  return value;
}

export function useGameSettings(): GameSettings {
  return useGameContext().settings;
}

export function useGameActive(): boolean {
  return useGameContext().active;
}
