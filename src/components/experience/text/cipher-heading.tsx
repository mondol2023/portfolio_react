"use client";

import { motion, type Variants } from "motion/react";
import { createElement, type ElementType } from "react";

import { motionElement } from "@/components/motion/motion-element";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Character-by-character headline entrance: blurred and displaced, resolving to
 * sharp.
 *
 * `AnimatedText` already staggers by *word* and is the right tool almost
 * everywhere — one component per headline is not worth the extra DOM. This one
 * exists for the hero alone, where the name is the first thing on the screen
 * and the extra granularity is the difference between text appearing and text
 * *materialising*. Reserve it for that.
 *
 * The blur is the expensive part and the reason this is not the default: a
 * `filter` animation on dozens of spans forces a repaint per frame. At hero
 * scale, once per page load, that is affordable; in a list it would not be.
 */

interface CipherHeadingProps {
  text: string;
  className?: string;
  /** Seconds before the first character moves. */
  delay?: number;
  /** Seconds between characters. */
  step?: number;
  as?: ElementType;
}

const charVariants: Variants = {
  hidden: { opacity: 0, y: "0.5em", filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: "0em",
    filter: "blur(0px)",
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

const staticVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
};

export function CipherHeading({
  text,
  className,
  delay = 0,
  step = 0.035,
  as = "span",
}: CipherHeadingProps) {
  const reducedMotion = useMotionPreference();

  // Split to words first and to characters within them: a bare character split
  // would let the browser break a line in the middle of a name.
  const words = text.split(" ");

  return createElement(
    motionElement(as),
    {
      className,
      initial: "hidden",
      animate: "visible",
      variants: {
        hidden: {},
        visible: {
          transition: reducedMotion
            ? { delayChildren: 0 }
            : { delayChildren: delay, staggerChildren: step },
        },
      },
      // The whole string stays in the accessibility tree as one label, so a
      // screen reader announces a name rather than a column of letters.
      "aria-label": text,
    },
    words.map((word, wordIndex) => (
      <span key={`${word}-${wordIndex}`} aria-hidden="true" className="inline-block whitespace-nowrap">
        {[...word].map((char, charIndex) => (
          <motion.span
            key={`${char}-${charIndex}`}
            className="inline-block"
            variants={reducedMotion ? staticVariants : charVariants}
          >
            {char}
          </motion.span>
        ))}
        {wordIndex < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
      </span>
    )),
  );
}
