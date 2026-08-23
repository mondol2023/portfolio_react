import { Pause } from "lucide-react";

import {
  ArcadeAction,
  ArcadeActionLink,
  ArcadeExit,
  ArcadePanel,
  ArcadeScope,
  ArcadeScore,
} from "@/components/play/arcade-chrome";
import { GameState } from "@/lib/game/types";

/**
 * UI chrome over the canvas: start screen, score HUD, game-over screen.
 *
 * Pointer events are off by default so clicks fall through to the canvas for
 * steering, and re-enabled only on the interactive bits (buttons, back link).
 *
 * Everything visible here comes from `arcade-chrome`, so this screen and the
 * Project Arcade it is launched from are the same cabinet. The button ids are
 * load-bearing — `use-game` binds its handlers to them by id — so they are
 * passed straight through and must not be renamed here.
 */

interface GameOverlayProps {
  state: GameState;
  score: number;
}

export function GameOverlay({ state, score }: GameOverlayProps) {
  return (
    <ArcadeScope className="pointer-events-none absolute inset-0 flex flex-col">
      <ArcadeExit href="/play" label="Cabinet select" className="absolute top-4 left-4" />

      {state === GameState.PLAYING ? (
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <ArcadeScore score={score} />
          <button
            id="pause-btn"
            type="button"
            aria-label="Pause"
            className="pointer-events-auto rounded-full border border-border bg-surface/80 p-2.5 text-fg-muted backdrop-blur-sm transition-colors hover:border-tone hover:text-tone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
          >
            <Pause aria-hidden="true" className="size-4" />
          </button>
        </div>
      ) : null}

      {state === GameState.IDLE ? (
        <Centered>
          <ArcadePanel
            status="Cartridge loaded"
            title="3D Snake"
            actions={
              <>
                <ArcadeAction id="play-btn">Play</ArcadeAction>
                <ArcadeActionLink href="/">Return to portfolio</ArcadeActionLink>
              </>
            }
          >
            Click anywhere on the field to steer. Eat the orange spheres, avoid your own tail, and
            use the edges — they wrap around.
          </ArcadePanel>
        </Centered>
      ) : null}

      {state === GameState.PAUSED ? (
        <Centered>
          <ArcadePanel
            status={`Score ${String(score).padStart(3, "0")}`}
            title="Paused"
            actions={<ArcadeAction id="resume-btn">Resume</ArcadeAction>}
          />
        </Centered>
      ) : null}

      {state === GameState.GAME_OVER ? (
        <Centered>
          <ArcadePanel
            status={`Score ${String(score).padStart(3, "0")}`}
            title="Game over"
            actions={
              <>
                <ArcadeAction id="restart-btn">Play again</ArcadeAction>
                <ArcadeActionLink href="/">Return to portfolio</ArcadeActionLink>
              </>
            }
          />
        </Centered>
      ) : null}
    </ArcadeScope>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center px-6">{children}</div>;
}
