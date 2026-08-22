"use client";

import { useEffect, useRef, useState } from "react";

import { GLITCH } from "@/lib/experience/springs";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

interface ScrambleOptions {
  /** Runs the scramble when true; the text sits resolved when false. */
  active?: boolean;
  /** Seconds before the first character starts resolving. */
  delay?: number;
  /** Seconds each character spends scrambling. Defaults to `GLITCH.charDuration`. */
  step?: number;
}

/**
 * Resolves text out of noise, one character at a time, left to right.
 *
 * Used by the loader's system messages, the nav's section labels and section
 * headings, so the whole site glitches with a single hand. Whitespace is never
 * scrambled — corrupting the spaces turns a phrase into a solid block and
 * destroys the word shapes the reader is tracking.
 *
 * Driven by `requestAnimationFrame` against a wall clock rather than by a tick
 * counter, so a busy frame drops glyphs instead of stretching the effect, and
 * the text always lands on time. Under `prefers-reduced-motion` it returns the
 * final string immediately and never starts a loop.
 */
export function useScramble(text: string, options: ScrambleOptions = {}): string {
  const { active = true, delay = 0, step = GLITCH.charDuration } = options;
  const reducedMotion = useMotionPreference();
  // Keyed by the string it was produced from, so a caller that swaps `text`
  // mid-scramble never shows one frame of the previous word's noise. When the
  // key does not match — or nothing is scrambling — the real text is returned,
  // which is also what keeps the effect free of any synchronous state write.
  const [noise, setNoise] = useState<{ key: string; value: string } | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!active || reducedMotion) return;

    const start = performance.now() + delay * 1000;
    const charset = GLITCH.charset;
    const target = text.replace(/\s/g, "").length;
    // Characters resolve on a stagger and each takes `step * passes` to settle,
    // so the tail of the string is still noise while the head is legible.
    const settleAt = (index: number) => start + (index + GLITCH.passes) * step * 1000;

    function tick(now: number) {
      let resolved = 0;
      const value = text
        .split("")
        .map((char, index) => {
          if (char === " " || char === "\n") return char;
          if (now >= settleAt(index)) {
            resolved += 1;
            return char;
          }
          if (now < start) return "";
          return charset[Math.floor(Math.random() * charset.length)];
        })
        .join("");

      if (resolved >= target) {
        setNoise(null);
        return;
      }

      setNoise({ key: text, value });
      frame.current = requestAnimationFrame(tick);
    }

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [text, active, delay, step, reducedMotion]);

  return noise?.key === text ? noise.value : text;
}
