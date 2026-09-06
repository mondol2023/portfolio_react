"use client";

import { GameOverlay, GameProvider, GameScene } from "@/game";

/**
 * The mounted world, behind the host's content and never blocking it.
 *
 * `GameProvider` carries activation; `GameScene` is the canvas layer
 * (z-index -5, pointer-events none); `GameOverlay` adds the score chip.
 * A visitor's exploration XP — the host's own store — is deliberately NOT
 * fed by world events: the world keeps its own score, the portfolio keeps
 * its own, and neither knows the other's internals.
 */
export default function WorldLayerClient() {
  return (
    <GameProvider active>
      <GameScene />
      <GameOverlay />
    </GameProvider>
  );
}
