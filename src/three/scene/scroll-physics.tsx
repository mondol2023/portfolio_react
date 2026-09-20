"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";

import { clampDelta, springStep, type SpringState } from "@/lib/experience/scene-motion";
import { sceneScroll } from "@/lib/experience/scene-scroll";
import { tickSceneTimer } from "@/lib/experience/scene-timer";
import { getSceneProgress, subscribeSceneProgress } from "@/lib/experience/use-scene-progress";

/**
 * The one place scroll turns into motion.
 *
 * Native scroll gives the reader a position instantly; this gives the world
 * behind them mass, by running that position through `SPRING.rail` once per
 * frame and publishing the result to `scene-scroll.ts`. Every `useFrame` in the
 * canvas reads that value, so the weight is applied once rather than
 * re-derived — and the DOM column above stays on untouched native scroll, with
 * keyboard, find-in-page and anchor jumps intact.
 *
 * This is the answer to D3. Lenis was deleted rather than adopted: it cancels
 * wheel events and advances scroll from its own raf, so sharing R3F's loop
 * would have made the page scrollable only while an optional, code-split,
 * admin-switchable WebGL canvas was ticking.
 */

/** Fixed integration step. `springStep` is explicit Euler, which diverges for `dt > 2m/c` — 26.7ms here. */
const SUBSTEP = 1 / 120;

interface ScrollPhysicsProps {
  reducedMotion: boolean;
  /** False while the canvas is off-screen or backgrounded, i.e. not ticking. */
  active: boolean;
}

export function ScrollPhysics({ reducedMotion, active }: ScrollPhysicsProps) {
  const spring = useRef<SpringState>({ value: 0, velocity: 0 });
  const accumulator = useRef(0);
  // The canvas is code-split, so it can mount after the reader has already
  // scrolled; springing up from 0 would sweep the whole story past them.
  const primed = useRef(false);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (active) primed.current = false;
  }, [active]);

  useEffect(() => {
    if (!reducedMotion) return;
    // "demand" renders only when asked, so there is no frame to integrate in.
    // Scroll lands unsmoothed — which is what reduced motion asks for — and
    // wakes the renderer itself.
    function snap() {
      const next = getSceneProgress();
      spring.current.value = next;
      spring.current.velocity = 0;
      sceneScroll.progress = next;
      invalidate();
    }

    snap();
    return subscribeSceneProgress(snap);
  }, [reducedMotion, invalidate]);

  useFrame((_state, rawDelta) => {
    // First read of the frame (S6): every other `useFrame` below this one in
    // mount order sees this frame's `sceneTime`, not last frame's.
    tickSceneTimer();

    if (reducedMotion) return;

    const target = getSceneProgress();

    if (!primed.current) {
      primed.current = true;
      spring.current.value = target;
      spring.current.velocity = 0;
      accumulator.current = 0;
      sceneScroll.progress = target;
      return;
    }

    accumulator.current += clampDelta(rawDelta);
    while (accumulator.current >= SUBSTEP) {
      accumulator.current -= SUBSTEP;
      springStep(spring.current, target, "rail", SUBSTEP);
    }

    sceneScroll.progress = spring.current.value;
  });

  return null;
}
