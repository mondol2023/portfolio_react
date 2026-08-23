"use client";

import { useMotionValueEvent, type MotionValue } from "motion/react";
import { useEffect, useMemo, useRef } from "react";

import { seededRandom } from "@/lib/experience/random";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * The signal meter beside the message field: a row of bars that answers the
 * visitor's typing, so composing a message looks like transmitting one.
 *
 * The bars are written to imperatively from a single animation-frame loop —
 * one loop for the whole row, `scaleY` on a ref per bar. The obvious version
 * (state per bar, or a Motion component per bar) re-renders the form on every
 * frame the visitor is typing, which is the one moment it must not stutter.
 *
 * Under reduced motion the meter is still built and still responds to typing —
 * it just steps to a level instead of oscillating, so the row remains an
 * honest readout rather than a deleted feature.
 */

const BAR_COUNT = 28;
/** Height of a bar at rest, as a fraction of the track. */
const REST = 0.12;
/** Per-bar oscillation speed, in radians per second. */
const SPEED = 7.5;

interface WaveFormProps {
  /** 0..1 typing energy, from `useTypingPulse`. */
  energy: MotionValue<number>;
  /** False while the field is untouched — the row sits flat. */
  live: boolean;
  className?: string;
}

export function WaveForm({ energy, live, className }: WaveFormProps) {
  const reducedMotion = useMotionPreference();
  const bars = useRef<(HTMLSpanElement | null)[]>([]);

  // Fixed per-bar character, generated once: an envelope that fades the row out
  // at both ends, and a phase offset so the bars do not pump in unison.
  const shape = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, index) => {
        const random = seededRandom(0x5e41 + index);
        const centred = 1 - Math.abs(index / (BAR_COUNT - 1) - 0.5) * 2;
        return {
          envelope: 0.35 + centred * 0.65,
          phase: random() * Math.PI * 2,
          jitter: 0.6 + random() * 0.7,
        };
      }),
    [],
  );

  // Reduced motion has no loop to drive it, so the level is applied whenever
  // the energy changes instead.
  useMotionValueEvent(energy, "change", (value) => {
    if (!reducedMotion) return;
    const level = live ? value : 0;
    for (let index = 0; index < BAR_COUNT; index += 1) {
      const bar = bars.current[index];
      const { envelope } = shape[index]!;
      if (bar) bar.style.transform = `scaleY(${REST + level * envelope * 0.8})`;
    }
  });

  useEffect(() => {
    if (reducedMotion) return;

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      const level = live ? energy.get() : 0;

      for (let index = 0; index < BAR_COUNT; index += 1) {
        const bar = bars.current[index];
        if (!bar) continue;

        const { envelope, phase, jitter } = shape[index]!;
        // Rectified sine: bars swing up from the baseline rather than through
        // it, which is what a level meter does.
        const swing = Math.abs(Math.sin(elapsed * SPEED * jitter + phase));
        bar.style.transform = `scaleY(${REST + level * envelope * swing * 0.9})`;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [energy, live, reducedMotion, shape]);

  return (
    <div
      aria-hidden="true"
      className={cn("flex h-8 items-center gap-[3px]", className)}
    >
      {Array.from({ length: BAR_COUNT }, (_, index) => (
        <span
          key={index}
          ref={(node) => {
            bars.current[index] = node;
          }}
          className="h-full w-[3px] flex-1 rounded-full bg-tone/70 transition-colors"
          style={{ transform: `scaleY(${REST})`, transformOrigin: "center" }}
        />
      ))}
    </div>
  );
}
