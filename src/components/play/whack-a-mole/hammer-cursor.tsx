"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { WHACK_CONFIG } from "@/lib/whack-a-mole/config";

/** Viewport-space point to strike. Pass a *new* object per hit — the effect below keys off identity, not value, so a repeat hole still retriggers. */
export interface HammerStrike {
  x: number;
  y: number;
}

interface HammerCursorProps {
  strike: HammerStrike | null;
}

/** Resting spot — fixed near the top of the screen, never follows the pointer. */
const HOME_LEFT = "50%";
const HOME_TOP = "9%";

type Phase = "idle" | "vanish" | "appear" | "blast" | "returning";

// Millisecond marks along one strike sequence — pulled from WHACK_CONFIG so
// the hole's own hit reaction (driven by `useWhackAMole`) can't drift out of
// sync with this visual swing; in particular, the hole isn't allowed to react
// until `hammerImpactMs`, once the hammer has actually finished growing onto it.
const APPEAR_AT_MS = WHACK_CONFIG.hammerAppearMs; // puff-out at home finishes, hammer jumps above the hole
const BLAST_AT_MS = WHACK_CONFIG.hammerBlastMs; // bang finishes, hammer starts enlarging onto the hole
const RETURNING_AT_MS = WHACK_CONFIG.hammerImpactMs; // grow finishes (impact!), hammer starts fading out at the hole
const IDLE_AT_MS = WHACK_CONFIG.hammerIdleMs; // fully faded — jump back home and fade back in

/**
 * The hammer rests fixed near the top of the screen and no longer chases the
 * pointer. Each hit drives it through a short strike sequence: vanish in a
 * puff of cloud at home, reappear above the hole that was hit with a bang,
 * enlarge itself onto the hole (the "blast"), then fade back home.
 */
export function HammerCursor({ strike }: HammerCursorProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [target, setTarget] = useState<HammerStrike | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!strike) return;

    timersRef.current.forEach(clearTimeout);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (fn: () => void, ms: number) => {
      timers.push(setTimeout(fn, ms));
    };

    // Routed through `schedule` (even at 0ms) rather than called directly here —
    // setState synchronously in an effect body triggers cascading renders.
    schedule(() => setPhase("vanish"), 0);
    schedule(() => {
      setTarget(strike);
      setPhase("appear");
    }, APPEAR_AT_MS);
    schedule(() => setPhase("blast"), BLAST_AT_MS);
    schedule(() => setPhase("returning"), RETURNING_AT_MS);
    schedule(() => {
      setPhase("idle");
      setTarget(null);
    }, IDLE_AT_MS);

    timersRef.current = timers;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [strike]);

  const atHome = phase === "idle" || phase === "vanish";
  const hidden = phase === "vanish" || phase === "returning";

  const hammerStyle: CSSProperties = atHome
    ? {
        left: HOME_LEFT,
        top: HOME_TOP,
        transform: "translate(-50%, -50%) rotate(-12deg) scale(1)",
      }
    : {
        left: target?.x,
        top: target?.y,
        transform: `translate(-50%, -55%) rotate(6deg) scale(${phase === "appear" ? 1 : 1.9})`,
      };

  return (
    <>
      {phase === "vanish" ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 text-4xl select-none"
          style={{
            left: HOME_LEFT,
            top: HOME_TOP,
            transform: "translate(-50%, -50%)",
            animation: "hammer-puff 100ms ease-out forwards",
          }}
        >
          💨
        </div>
      ) : null}

      {phase === "appear" && target ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-50 text-4xl select-none"
          style={{
            left: target.x,
            top: target.y,
            transform: "translate(-50%, -50%)",
            animation: "hammer-bang 150ms ease-out forwards",
          }}
        >
          💥
        </div>
      ) : null}

      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-50 text-5xl leading-none select-none"
        style={{
          ...hammerStyle,
          opacity: hidden ? 0 : 1,
          transition: "transform 160ms ease-out, opacity 120ms ease-out",
        }}
      >
        🔨
      </div>
    </>
  );
}
