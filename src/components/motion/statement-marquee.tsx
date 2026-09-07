"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

import { DURATION, EASE_OUT } from "./variants";

/**
 * Full-bleed band that cross-dissolves through a handful of short statements
 * about the site owner, one at a time, instead of a single static line.
 *
 * Modelled on the "wall of declarations" rhythm agency sites use for a
 * manifesto strip between the hero and the rest of the page — built from this
 * site's own motion vocabulary (`variants.ts`, `useMotionPreference`) and its
 * own content, not any copied markup, asset or text.
 *
 * The two statements involved in a swap are stacked in the same grid cell so
 * the outgoing line fades out while the incoming one fades in over it, rather
 * than one appearing after the other with a gap. Every statement here already
 * appears, readable and labelled, elsewhere on the page (the hero tagline, the
 * about philosophy, the name/title, the availability badge) — this band is a
 * decorative restatement, so it is hidden from assistive tech rather than
 * announced a second time.
 */

const INTERVAL_MS = 4200;

interface StatementMarqueeProps {
  statements: readonly string[];
  className?: string;
}

export function StatementMarquee({ statements, className }: StatementMarqueeProps) {
  const reducedMotion = useMotionPreference();
  const items = statements.map((s) => s.trim()).filter(Boolean);
  const count = items.length;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // Reduced motion drops the rotation outright, the same rule `SiteAnimations`
  // applies to anything that moves on its own — the first statement stays put.
  useEffect(() => {
    if (reducedMotion || paused || count < 2) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [reducedMotion, paused, count]);

  // A backgrounded tab shouldn't burn through the rotation unseen, and
  // shouldn't dump the reader several statements further along when they
  // switch back.
  useEffect(() => {
    function onVisibilityChange() {
      setPaused(document.hidden);
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  if (count === 0) return null;

  const current = items[reducedMotion ? 0 : index % count];

  return (
    <div
      aria-hidden="true"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      className={cn(
        "relative isolate overflow-hidden border-y border-border bg-bg-subtle/40 py-14 sm:py-20",
        className,
      )}
    >
      <div aria-hidden="true" className="surface-grid pointer-events-none absolute inset-0 opacity-40" />

      <div className="container-page relative grid">
        <AnimatePresence initial={false}>
          <motion.p
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : DURATION.slow, ease: EASE_OUT }}
            className={cn(
              "col-start-1 row-start-1 text-balance text-center",
              "font-serif text-2xl leading-snug text-fg italic sm:text-4xl",
            )}
          >
            {current}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
