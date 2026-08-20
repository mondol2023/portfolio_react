"use client";

import { useEffect, useRef, useState } from "react";

import { GameEngine } from "@/lib/game/game-engine";
import { GameState } from "@/lib/game/types";

import { GameOverlay } from "./game-overlay";

/**
 * Bridges React and the vanilla `GameEngine`.
 *
 * React owns exactly two things here: the mount point (a div `GameEngine`
 * renders its canvas into) and the two bits of state the overlay needs.
 * Everything about the game itself — scene, entities, input, loop — lives
 * outside React and is untouched by its re-renders.
 */
export function Game() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<GameState>(GameState.IDLE);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const engine = new GameEngine(container);
    const offState = engine.on("statechange", setState);
    const offScore = engine.on("score", setScore);

    // Runs on unmount, and twice in dev under StrictMode — `engine.destroy()`
    // removes the canvas and every listener, so the re-mount that follows
    // starts from a clean container rather than doubling anything up.
    return () => {
      offState();
      offScore();
      engine.destroy();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black">
      <div ref={containerRef} className="absolute inset-0" />
      <GameOverlay state={state} score={score} />
    </div>
  );
}
