"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { buttonClasses } from "@/components/ui/button";
import { useQuest } from "@/lib/game/quest/use-quest";
import { WHACK_CONFIG } from "@/lib/whack-a-mole/config";
import { GameState } from "@/lib/whack-a-mole/types";
import { useWhackAMole } from "@/lib/whack-a-mole/use-whack-a-mole";

import { HammerCursor, type HammerStrike } from "./hammer-cursor";
import { Hole } from "./hole";

/** Full-viewport whack-a-mole game: board, HUD, hammer cursor, and start/end overlays. */
export function WhackAMoleGame() {
  const { state, score, holes, frozen, hit, start } = useWhackAMole();
  // A fresh object per hit — HammerCursor keys its strike animation off identity,
  // so re-hitting the same hole still retriggers the sequence.
  const [strike, setStrike] = useState<HammerStrike | null>(null);
  const { playGame } = useQuest();

  // Same rule as the snake page: the round has to actually begin.
  useEffect(() => {
    if (state === GameState.PLAYING) playGame("whack-a-mole");
  }, [state, playGame]);

  const handleHit = (index: number, rect: DOMRect) => {
    hit(index);
    setStrike({ x: rect.left + rect.width / 2, y: rect.top });
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-gradient-to-b from-sky-900 via-emerald-950 to-emerald-900 text-white">
      <HammerCursor strike={strike} />

      <Link
        href="/play"
        className="pointer-events-auto absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-sm backdrop-blur hover:bg-black/60"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back
      </Link>

      {state === GameState.PLAYING ? (
        <p className="absolute top-4 right-4 z-10 rounded-full bg-black/40 px-4 py-1.5 text-sm font-medium backdrop-blur">
          Score: {score} / {WHACK_CONFIG.winScore}
        </p>
      ) : null}

      <div className="flex flex-1 items-center justify-center p-6">
        <div
          className="grid w-full max-w-lg gap-4"
          style={{ gridTemplateColumns: `repeat(${WHACK_CONFIG.cols}, minmax(0, 1fr))` }}
        >
          {holes.map((mole, index) => (
            <Hole key={index} mole={mole} frozen={frozen} onHit={(rect) => handleHit(index, rect)} />
          ))}
        </div>
      </div>

      {state !== GameState.PLAYING ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/60 px-6 text-center backdrop-blur-sm">
          {state === GameState.WON ? (
            <>
              <h1 className="text-3xl font-semibold">You win! 🎉</h1>
              <p className="text-white/70">Score: {score}</p>
            </>
          ) : state === GameState.LOST ? (
            <>
              <h1 className="text-3xl font-semibold">Try hard later</h1>
              <p className="text-white/70">Score: {score}</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-semibold">Whack-a-Mole</h1>
              <p className="max-w-sm text-white/70">
                Whack the goat, sheep, and cat for +{WHACK_CONFIG.goodPoints} each. Avoid the fox
                — it costs {Math.abs(WHACK_CONFIG.badPoints)}. Reach {WHACK_CONFIG.winScore} to
                win before you hit {WHACK_CONFIG.loseScore}.
              </p>
            </>
          )}
          <button id="whack-play-btn" type="button" className={buttonClasses("primary", "lg")} onClick={start}>
            {state === GameState.IDLE ? "Play" : "Play Again"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
