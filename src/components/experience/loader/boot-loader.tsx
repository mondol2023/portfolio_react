"use client";

import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from "motion/react";
import { useEffect, useState } from "react";

import { getLenis } from "@/components/experience/scroll/lenis-registry";
import { useScramble } from "@/lib/experience/use-scramble";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Boot sequence.
 *
 * The system messages are keyed to progress rather than to a timer, so the copy
 * always matches the number beside it — the counter is the single clock.
 */
const BOOT_MESSAGES = [
  { at: 0, text: "INITIALIZING SYSTEM..." },
  { at: 26, text: "LOADING ENVIRONMENT..." },
  { at: 58, text: "CONNECTING MODULES..." },
  { at: 100, text: "READY." },
] as const;

/**
 * Uneven keyframes, because a bar that climbs at a constant rate reads as a
 * decoration and one that stalls reads as work. It hesitates at 34 and again at
 * 76, then commits.
 */
const PROGRESS_KEYFRAMES = [0, 34, 41, 76, 82, 100];
const PROGRESS_TIMES = [0, 0.22, 0.38, 0.62, 0.78, 1];
const PROGRESS_DURATION = 2.4;

/** Vertical slats the screen splits into on the way out. */
const SLATS = 7;

type Phase = "boot" | "exit" | "done";

export function BootLoader({ name }: { name: string }) {
  const reducedMotion = useMotionPreference();
  const [phase, setPhase] = useState<Phase>("boot");
  const [messageIndex, setMessageIndex] = useState(0);

  const progress = useMotionValue(0);
  const percent = useTransform(progress, (value) => String(Math.round(value)).padStart(3, "0"));
  const barWidth = useTransform(progress, (value) => `${value}%`);

  const logo = useScramble(name.toUpperCase(), { active: phase === "boot" });
  const message = BOOT_MESSAGES[messageIndex]?.text ?? BOOT_MESSAGES[0].text;
  const messageText = useScramble(message, { active: phase === "boot", step: 0.02 });

  useMotionValueEvent(progress, "change", (value) => {
    // Walks backwards to the last message this value has passed, so a dropped
    // frame that skips a threshold still lands on the right line.
    let next = 0;
    for (let index = BOOT_MESSAGES.length - 1; index >= 0; index -= 1) {
      if (value >= (BOOT_MESSAGES[index]?.at ?? 0)) {
        next = index;
        break;
      }
    }
    setMessageIndex((current) => (current === next ? current : next));
  });

  // A visitor who has asked for less motion is not shown a 2.4-second animated
  // preamble to a page that is already rendered behind it. `phase` is left
  // alone and the whole thing is simply never active.
  const active = !reducedMotion && phase !== "done";

  useEffect(() => {
    if (reducedMotion) return;

    const controls = animate(progress, PROGRESS_KEYFRAMES, {
      duration: PROGRESS_DURATION,
      times: PROGRESS_TIMES,
      ease: "easeInOut",
      // A held beat on READY. before the screen tears itself apart.
      onComplete: () => window.setTimeout(() => setPhase("exit"), 420),
    });

    return () => controls.stop();
  }, [progress, reducedMotion]);

  // Nothing scrolls behind a loading screen. Lenis is paused rather than the
  // page being locked, so its internal position never diverges from the DOM's.
  useEffect(() => {
    if (!active) return;

    const lenis = getLenis();
    lenis?.stop();
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      lenis?.start();
      document.documentElement.style.overflow = previous;
    };
  }, [active]);

  if (!active) return null;

  const leaving = phase === "exit";

  return (
    <div
      data-boot-loader
      role="status"
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{ pointerEvents: leaving ? "none" : "auto" }}
    >
      {/* Without JavaScript nothing here ever animates away, so it never shows. */}
      <noscript>
        <style>{`[data-boot-loader]{display:none}`}</style>
      </noscript>

      {/* One stable announcement. The counter and the scrambling messages are
          hidden from assistive tech below: read aloud, a character-by-character
          resolve is noise, and a percentage that ticks 100 times is worse. */}
      <span className="sr-only">Loading the experience</span>

      {/* The backdrop is built from slats so the exit can tear it open rather
          than fade it — a fade would just be a slower version of nothing. */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: SLATS }, (_, index) => (
          <motion.div
            key={index}
            className="h-full flex-1 bg-boot-bg"
            style={{ transformOrigin: "top" }}
            animate={{ scaleY: leaving ? 0 : 1 }}
            transition={{
              duration: 0.55,
              ease: [0.76, 0, 0.24, 1],
              delay: leaving ? index * 0.045 : 0,
            }}
            onAnimationComplete={() => {
              if (leaving && index === SLATS - 1) setPhase("done");
            }}
          />
        ))}
      </div>

      <motion.div
        aria-hidden
        className="relative flex h-full w-full flex-col items-center justify-center gap-10 px-6"
        animate={leaving ? { opacity: 0, scale: 1.08, filter: "blur(12px)" } : { opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.7, 0, 0.84, 0] }}
      >
        <motion.p
          className="font-mono text-[clamp(1.75rem,7vw,4rem)] font-semibold tracking-[0.18em] text-boot-fg"
          animate={{
            // A low-frequency flicker: the logo is powering up, not blinking.
            opacity: [1, 0.72, 1, 0.9, 1],
            x: [0, -1.5, 1, 0],
          }}
          transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 1.1 }}
        >
          {logo || "\u00a0"}
        </motion.p>

        <div className="flex w-full max-w-md flex-col gap-3">
          <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.28em] text-boot-dim">
            <span className="text-boot-signal">{messageText}</span>
            <span className="tabular-nums text-boot-fg">
              <motion.span>{percent}</motion.span>%
            </span>
          </div>

          <div className="h-px w-full bg-boot-dim/40">
            <motion.div className="h-full bg-boot-signal" style={{ width: barWidth }} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
