"use client";

import { motion } from "motion/react";
import { createElement, type ElementType } from "react";

import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

import { motionElement } from "./motion-element";
import { DURATION, EASE_OUT, createStaggerVariants } from "./variants";

/**
 * Word-by-word entrance for headline text.
 *
 * Reserved for the hero and section titles — used everywhere it would become
 * noise. The full string stays in the accessibility tree as one label; the
 * per-word spans are hidden from assistive tech so a screen reader announces
 * "Nur Mohammed Pavel", not eleven fragments.
 */

interface AnimatedTextProps {
  text: string;
  className?: string;
  /** Seconds before the first word moves. */
  delay?: number;
  /** Seconds between words. */
  step?: number;
  as?: ElementType;
}

const wordVariants = {
  hidden: { opacity: 0, y: "0.4em" },
  visible: {
    opacity: 1,
    y: "0em",
    transition: { duration: DURATION.slow, ease: EASE_OUT },
  },
};

const staticVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.fast } },
};

export function AnimatedText({
  text,
  className,
  delay = 0,
  step = 0.06,
  as = "span",
}: AnimatedTextProps) {
  const reducedMotion = useMotionPreference();
  const words = text.split(" ");

  // See the note in `fade-in.tsx` on why this is `createElement` and not JSX.
  return createElement(
    motionElement(as),
    {
      className,
      initial: "hidden",
      animate: "visible",
      variants: createStaggerVariants(reducedMotion, step, delay),
      "aria-label": text,
    },
    words.map((word, index) => (
      <span
        // Words repeat within a sentence, so the index is part of the identity.
        key={`${word}-${index}`}
        aria-hidden="true"
        // `inline-block` is what allows the per-word transform; the trailing
        // space is rendered separately so the words still wrap naturally.
        className="inline-block whitespace-nowrap"
      >
        <motion.span
          className="inline-block"
          variants={reducedMotion ? staticVariants : wordVariants}
        >
          {word}
        </motion.span>
        {index < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
      </span>
    )),
  );
}
