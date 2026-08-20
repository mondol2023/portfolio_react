import { ArrowLeft, Pause } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonClasses } from "@/components/ui/button";
import { GameState } from "@/lib/game/types";

/**
 * UI chrome over the canvas: start screen, score HUD, game-over screen.
 *
 * Pointer events are off by default so clicks fall through to the canvas for
 * steering, and re-enabled only on the interactive bits (buttons, back link).
 */

interface GameOverlayProps {
  state: GameState;
  score: number;
}

export function GameOverlay({ state, score }: GameOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col text-white">
      <Link
        href="/play"
        className="pointer-events-auto absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-sm backdrop-blur hover:bg-black/60"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back
      </Link>

      {state === GameState.PLAYING ? (
        <div className="pointer-events-none absolute top-4 right-4 flex items-center gap-2">
          <p className="rounded-full bg-black/40 px-4 py-1.5 text-sm font-medium backdrop-blur">
            Score: {score}
          </p>
          <button
            id="pause-btn"
            type="button"
            aria-label="Pause"
            className="pointer-events-auto rounded-full bg-black/40 p-2.5 backdrop-blur hover:bg-black/60"
          >
            <Pause aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}

      {state === GameState.PAUSED ? (
        <Centered>
          <h1 className="text-3xl font-semibold">Paused</h1>
          <p className="text-white/70">Score: {score}</p>
          <button id="resume-btn" type="button" className={buttonClasses("primary", "lg")}>
            Resume
          </button>
        </Centered>
      ) : null}

      {state === GameState.IDLE ? (
        <Centered>
          <h1 className="text-3xl font-semibold">3D Snake</h1>
          <p className="max-w-sm text-white/70">
            Click anywhere on the field to steer. Eat the orange spheres, avoid your own tail, and
            use the edges — they wrap around.
          </p>
          <button id="play-btn" type="button" className={buttonClasses("primary", "lg")}>
            Play
          </button>
        </Centered>
      ) : null}

      {state === GameState.GAME_OVER ? (
        <Centered>
          <h1 className="text-3xl font-semibold">Game Over</h1>
          <p className="text-white/70">Score: {score}</p>
          <button id="restart-btn" type="button" className={buttonClasses("primary", "lg")}>
            Restart
          </button>
        </Centered>
      ) : null}
    </div>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-auto flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      {children}
    </div>
  );
}
