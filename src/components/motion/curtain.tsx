"use client";

import { motion, useInView } from "motion/react";
import { useRef, useState, type ReactNode } from "react";

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
 *
 * The trigger is watched on the *wrapper*, never on the child. Because the child
 * starts translated a full height down and the wrapper clips, the child is
 * absent from every intersection rectangle an IntersectionObserver computes — so
 * `whileInView` on the child can never fire, and the content stays hidden for
 * good. The wrapper occupies its normal place in the flow, which is exactly what
 * "has this scrolled into view" should be asking about anyway.
 */

interface CurtainProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function Curtain({ children, className, delay = 0 }: CurtainProps) {
  const reducedMotion = useMotionPreference();
  const wrapper = useRef<HTMLDivElement>(null);
  const inView = useInView(wrapper, {
    once: true,
    amount: 0.3,
    margin: "0px 0px -60px 0px",
  });
  const [revealed, setRevealed] = useState(false);

  const hidden = reducedMotion ? { opacity: 0 } : { y: "108%", opacity: 0 };

  return (
    <div ref={wrapper} className={cn(!revealed && "overflow-hidden", className)}>
      <motion.div
        initial={hidden}
        animate={inView ? { y: 0, opacity: 1 } : hidden}
        transition={{
          duration: reducedMotion ? DURATION.fast : DURATION.slow,
          ease: EASE_OUT,
          delay: reducedMotion ? 0 : delay,
        }}
        // Guarded: the settle of the initial hidden state is also a completed
        // animation, and unclipping then would leave the child hanging out
        // below the wrapper in full view.
        onAnimationComplete={() => {
          if (inView) setRevealed(true);
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
