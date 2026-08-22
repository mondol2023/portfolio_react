"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";

import { SPRING } from "@/lib/experience/springs";
import { useScramble } from "@/lib/experience/use-scramble";
import { NAV_ITEMS } from "@/lib/constants/navigation";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Progress rail.
 *
 * A hairline on the right edge that fills as the page moves, names the section
 * currently in view, and sends the occasional mote of light down its length.
 *
 * `activeSection` is a prop rather than a hook call. `DesktopChrome` already
 * runs the page's scroll-spy, and its own comment makes the rule explicit: a
 * third `IntersectionObserver` watching the same six elements for the same
 * answer would have to justify itself. This one cannot, so it takes the answer.
 *
 * Hidden below `md` — on a phone the rail would sit under a thumb, and the
 * taskbar already says which section is in focus.
 */

/** Motes sent down the rail, and the offset that keeps them from convoying. */
const PARTICLES = [0, 1.6, 3.1];

export function ScrollRail({ activeSection }: { activeSection: string | null }) {
  const reducedMotion = useMotionPreference();
  const { scrollYProgress } = useScroll();

  // Heavily damped: raw `scrollYProgress` jitters with every trackpad delta,
  // and a progress line that trembles reads as broken rather than precise.
  const progress = useSpring(scrollYProgress, SPRING.rail);
  const headOffset = useTransform(progress, (value) => `${Math.min(Math.max(value, 0), 1) * 100}%`);
  const percent = useTransform(progress, (value) =>
    String(Math.round(Math.min(Math.max(value, 0), 1) * 100)).padStart(2, "0"),
  );

  const label = NAV_ITEMS.find((item) => item.id === activeSection)?.label ?? "Home";
  // Re-runs whenever the label changes, so crossing a section boundary glitches
  // the word into place instead of swapping it.
  const scrambled = useScramble(label.toUpperCase(), { step: 0.03 });

  return (
    <div
      aria-hidden
      data-no-ripple
      className="pointer-events-none fixed top-1/2 right-5 z-40 hidden -translate-y-1/2 flex-col items-center gap-4 md:flex"
    >
      <motion.span className="font-mono text-[10px] tabular-nums tracking-[0.2em] text-fg-subtle">
        {percent}
      </motion.span>

      <div className="relative h-[38vh] w-px bg-border">
        <motion.div
          className="absolute inset-x-0 top-0 h-full origin-top bg-tone"
          style={{ scaleY: progress }}
        />

        {/* The head of the fill, riding the same value as the bar itself. */}
        <motion.div
          className="absolute -left-[2px] size-[5px] -translate-y-1/2 rounded-full bg-tone shadow-[0_0_10px_var(--tone)]"
          style={{ top: headOffset }}
        />

        {!reducedMotion &&
          PARTICLES.map((delay) => (
            <motion.div
              key={delay}
              className="absolute -left-px size-[3px] rounded-full bg-tone"
              initial={{ top: "0%", opacity: 0 }}
              animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
              transition={{
                duration: 2.6,
                delay,
                repeat: Infinity,
                repeatDelay: 2.2,
                ease: "linear",
                opacity: { duration: 2.6, times: [0, 0.15, 0.8, 1], repeat: Infinity, repeatDelay: 2.2, delay },
              }}
            />
          ))}
      </div>

      <span className="font-mono text-[10px] tracking-[0.3em] text-fg-subtle [writing-mode:vertical-rl]">
        {scrambled}
      </span>
    </div>
  );
}
