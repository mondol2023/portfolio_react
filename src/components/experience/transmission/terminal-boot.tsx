"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { useScramble } from "@/lib/experience/use-scramble";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * The channel handshake that runs above the form.
 *
 * It is the boot loader's grammar reused at section scale — but keyed to the
 * reader arriving rather than to the page loading, because a terminal that
 * finished connecting while the visitor was five screens away has connected to
 * nobody. `active` comes from the section's own in-view state.
 *
 * Reduced motion prints the whole log at once: the lines are information, and
 * withholding information behind a timer is not a motion preference.
 */

const LINES = [
  "ESTABLISHING CONNECTION...",
  "HANDSHAKE OK / CHANNEL SECURE",
  "READY TO RECEIVE TRANSMISSION.",
] as const;

/** Gap between one line resolving and the next appearing. */
const LINE_DELAY = 620;

export function TerminalBoot({ active, className }: { active: boolean; className?: string }) {
  const reducedMotion = useMotionPreference();
  const [timed, setShown] = useState(0);

  useEffect(() => {
    if (!active || reducedMotion) return;

    // One timer per line rather than a chain, so the whole sequence is torn
    // down together if the reader leaves before it finishes.
    const timers = LINES.map((_, index) =>
      window.setTimeout(() => setShown(index + 1), index * LINE_DELAY),
    );

    return () => timers.forEach(window.clearTimeout);
  }, [active, reducedMotion]);

  // The reduced-motion log is not a state the effect has to reach: it is what
  // the render already knows, so it is derived here rather than set from an
  // effect that would only re-render to arrive at the same answer.
  const shown = reducedMotion ? LINES.length : timed;
  const connected = shown >= LINES.length;

  return (
    <div
      className={cn(
        "rounded-card border border-tone/25 bg-surface/60 p-4 font-mono text-[11px] leading-relaxed tracking-[0.16em] uppercase sm:p-5",
        className,
      )}
    >
      {/* The log is decorative narration of a state the form already announces
          through its own labels and errors, so it is not read out twice. */}
      <div aria-hidden="true" className="flex flex-col gap-1.5">
        {LINES.map((line, index) => (
          <BootLine key={line} text={line} visible={index < shown} last={index === LINES.length - 1} />
        ))}
      </div>

      <div aria-hidden="true" className="mt-3 flex items-center gap-2 border-t border-tone/15 pt-3">
        <motion.span
          className={cn("size-1.5 rounded-full", connected ? "bg-tone" : "bg-fg-subtle")}
          animate={connected && !reducedMotion ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <span className={connected ? "text-tone" : "text-fg-subtle"}>
          {connected ? "Link established" : "Linking"}
        </span>
      </div>
    </div>
  );
}

function BootLine({ text, visible, last }: { text: string; visible: boolean; last: boolean }) {
  const resolved = useScramble(text, { active: visible, step: 0.018 });

  return (
    <p className={cn("flex gap-2", last ? "text-tone" : "text-fg-muted")}>
      <span className="text-fg-subtle">{visible ? ">" : " "}</span>
      <span>{resolved || "\u00a0"}</span>
    </p>
  );
}
