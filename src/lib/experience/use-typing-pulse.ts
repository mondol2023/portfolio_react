"use client";

import { useMotionValue, type MotionValue } from "motion/react";
import { useCallback, useEffect, useRef } from "react";

/**
 * Typing energy as a motion value.
 *
 * Every keystroke adds a bump; the value bleeds away on its own between them,
 * so a burst of typing reads as loud and a pause reads as quiet. It is a
 * `MotionValue` rather than state on purpose — this is read once per animation
 * frame by the waveform, and putting it in state would re-render the form on
 * every character the visitor types.
 *
 * The decay loop only runs while there is something to decay: it starts on the
 * first bump and stops itself once the value reaches the floor, so an idle form
 * costs nothing.
 */

/** Energy added per keystroke, before clamping. */
const BUMP = 0.34;
/** Fraction of the remaining energy lost per second. */
const DECAY = 3.2;
/** Below this the loop stops and the value is snapped to 0. */
const FLOOR = 0.002;

export interface TypingPulse {
  /** 0..1 — how hard the visitor is typing right now. */
  energy: MotionValue<number>;
  /** Call on every input event. */
  bump: () => void;
}

export function useTypingPulse(): TypingPulse {
  const energy = useMotionValue(0);
  const frame = useRef<number | null>(null);
  const last = useRef(0);

  const stop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  // The decay loop lives inside `bump` as a hoisted function declaration rather
  // than as its own `useCallback`: it has to schedule itself, and a memoized
  // arrow that references its own binding is read before it is declared, which
  // this repo's `react-hooks/immutability` rule rejects outright.
  const bump = useCallback(() => {
    energy.set(Math.min(1, energy.get() + BUMP));
    if (frame.current !== null) return;

    function tick(now: number) {
      const delta = Math.min((now - last.current) / 1000, 0.1);
      last.current = now;

      const next = energy.get() * Math.exp(-DECAY * delta);
      if (next <= FLOOR) {
        energy.set(0);
        frame.current = null;
        return;
      }

      energy.set(next);
      frame.current = requestAnimationFrame(tick);
    }

    last.current = performance.now();
    frame.current = requestAnimationFrame(tick);
  }, [energy]);

  useEffect(() => stop, [stop]);

  return { energy, bump };
}
