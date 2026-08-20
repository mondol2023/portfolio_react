"use client";

import { WHACK_CONFIG } from "@/lib/whack-a-mole/config";
import type { HoleMole } from "@/lib/whack-a-mole/types";

import { Creature3D } from "./creature-3d";

interface HoleProps {
  mole: HoleMole;
  /** True while the board is paused for another hole's strike sequence — halts this creature's idle spin too. */
  frozen: boolean;
  /** Called with the hit button's viewport rect, so the caller can aim the hammer's strike animation at it. */
  onHit: (rect: DOMRect) => void;
}

/** Phases where the character is up (or animating towards being up) rather than tucked back in the hole. */
const RAISED_PHASES = new Set(["rising", "up", "hit", "dizzy"]);

/** A single dirt hole: a 3D character that rises, waits, gets whacked, and drops back in. */
export function Hole({ mole, frozen, onHit }: HoleProps) {
  const raised = RAISED_PHASES.has(mole.phase);
  const hit = mole.phase === "hit";
  const dizzy = mole.phase === "dizzy";

  return (
    <div className="relative aspect-square overflow-hidden rounded-[50%] bg-gradient-to-b from-black/80 via-black/50 to-transparent">
      {mole.character ? (
        <button
          type="button"
          onClick={(event) => onHit(event.currentTarget.getBoundingClientRect())}
          disabled={mole.phase !== "up"}
          aria-label={`Hit the ${mole.character.label}`}
          className={`absolute inset-x-0 bottom-0 flex justify-center transition-transform ease-out ${
            hit ? "scale-90 rotate-6 grayscale" : ""
          } ${dizzy ? "animate-[dizzy-wobble_420ms_ease-in-out_infinite]" : ""}`}
          style={{
            transitionDuration: `${raised ? mole.riseMs : WHACK_CONFIG.descendMs}ms`,
            transform: raised ? "translateY(0%)" : "translateY(100%)",
          }}
        >
          <Creature3D kind={mole.character.id} className="size-14 sm:size-16" frozen={frozen} speed={mole.spinSpeed} />
        </button>
      ) : null}
      {hit ? (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div
            className="size-1/2 rounded-full border-4 border-white/85"
            style={{ animation: "hole-blast-ring 340ms ease-out forwards" }}
          />
        </div>
      ) : null}
      {dizzy ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
          style={{ animation: "dizzy-star-orbit 900ms linear infinite" }}
        >
          <div className="relative size-10">
            <span className="absolute top-0 left-1/2 -translate-x-1/2 text-lg">⭐</span>
            <span className="absolute top-1/2 right-0 -translate-y-1/2 text-lg">✨</span>
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-lg">⭐</span>
            <span className="absolute top-1/2 left-0 -translate-y-1/2 text-lg">✨</span>
          </div>
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 rounded-b-[50%] bg-black/50" />
    </div>
  );
}
