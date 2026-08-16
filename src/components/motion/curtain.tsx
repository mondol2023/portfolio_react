"use client";

import { motion } from "motion/react";
import { useState, type ReactNode } from "react";

import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

import { DURATION, EASE_OUT } from "./variants";

/**
 * Masked reveal — content slides up from behind its own top edge, as if it had
 * been hiding underneath the line above it.
 *
 * Different from `<Reveal>` on purpose: that one fades an element in from a
 * small offset, this one clips. The child starts fully below the wrapper and is
 * invisible not because of opacity but because the wrapper's overflow hides it,
 * which is what gives the "comes out from hiding" feel rather than "fades in".
 *
 * The clipping is dropped once the animation finishes. Left on, it would crop
 * focus rings and any hover state that paints outside the box — a permanent
 * cost for a one-second effect.
 */

interface CurtainProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function Curtain({ children, className, delay = 0 }: CurtainProps) {
  const reducedMotion = useMotionPreference();
  const [revealed, setRevealed] = useState(false);

  return (
    <div className={cn(!revealed && "overflow-hidden", className)}>
      <motion.div
        initial={reducedMotion ? { opacity: 0 } : { y: "108%", opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.3, margin: "0px 0px -60px 0px" }}
        transition={{
          duration: reducedMotion ? DURATION.fast : DURATION.slow,
          ease: EASE_OUT,
          delay: reducedMotion ? 0 : delay,
        }}
        onAnimationComplete={() => setRevealed(true)}
      >
        {children}
      </motion.div>
    </div>
  );
}
