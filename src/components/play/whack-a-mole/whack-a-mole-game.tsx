"use client";

import { useState } from "react";

import {
  ArcadeAction,
  ArcadeActionLink,
  ArcadeExit,
  ArcadePanel,
  ArcadeScope,
  ArcadeScore,
} from "@/components/play/arcade-chrome";
import { WHACK_CONFIG } from "@/lib/whack-a-mole/config";
import { GameState } from "@/lib/whack-a-mole/types";
import { useWhackAMole } from "@/lib/whack-a-mole/use-whack-a-mole";

import { HammerCursor, type HammerStrike } from "./hammer-cursor";
import { Hole } from "./hole";

/**
 * Full-viewport whack-a-mole game: board, HUD, hammer cursor, and start/end
 * overlays.
 *
 * The board keeps its own sky-to-field gradient — that is the game's art, not
 * site chrome — while everything laid over it comes from `arcade-chrome`, so
 * the exit, the score and the end screens match the snake cabinet and the
 * Project Arcade both games are launched from.
 */
export function WhackAMoleGame() {
  const { state, score, holes, frozen, hit, start } = useWhackAMole();
  // A fresh object per hit — HammerCursor keys its strike animation off identity,
  // so re-hitting the same hole still retriggers the sequence.
  const [strike, setStrike] = useState<HammerStrike | null>(null);

  const handleHit = (index: number, rect: DOMRect) => {
    hit(index);
    setStrike({ x: rect.left + rect.width / 2, y: rect.top });
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-gradient-to-b from-sky-900 via-emerald-950 to-emerald-900 text-white">
      <HammerCursor strike={strike} />

      <ArcadeScope className="pointer-events-none absolute inset-0 z-10">
        <ArcadeExit href="/play" label="Cabinet select" className="absolute top-4 left-4" />

        {state === GameState.PLAYING ? (
          <ArcadeScore
            score={score}
            target={WHACK_CONFIG.winScore}
            className="absolute top-4 right-4"
          />
        ) : null}
      </ArcadeScope>

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
        <ArcadeScope className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
          <ArcadePanel
            status={
              state === GameState.IDLE
                ? "Cartridge loaded"
                : `Score ${String(score).padStart(3, "0")}`
            }
            title={
              state === GameState.WON
                ? "You win"
                : state === GameState.LOST
                  ? "Game over"
                  : "Whack-a-Mole"
            }
            actions={
              <>
                <ArcadeAction id="whack-play-btn" onClick={start}>
                  {state === GameState.IDLE ? "Play" : "Play again"}
                </ArcadeAction>
                <ArcadeActionLink href="/">Return to portfolio</ArcadeActionLink>
              </>
            }
          >
            {state === GameState.IDLE ? (
              <>
                Whack the goat, sheep, and cat for +{WHACK_CONFIG.goodPoints} each. Avoid the fox
                — it costs {Math.abs(WHACK_CONFIG.badPoints)}. Reach {WHACK_CONFIG.winScore} to
                win before you hit {WHACK_CONFIG.loseScore}.
              </>
            ) : null}
          </ArcadePanel>
        </ArcadeScope>
      ) : null}
    </div>
  );
}
