"use client";

import { useScramble } from "@/lib/experience/use-scramble";

/**
 * A rendered form of `useScramble`, for the common case where a caller only
 * wants the effect on a run of text and has no other use for the string.
 *
 * The resolved text is what sits in the accessibility tree; the noise is hidden
 * from it. Announcing intermediate glyphs would turn a decorative flicker into
 * a screen reader reading gibberish, and on a live region it would read it
 * dozens of times.
 */

interface ScrambleTextProps {
  text: string;
  className?: string;
  delay?: number;
  /** Reserves the final width so surrounding layout does not shift as it lands. */
  fixedWidth?: boolean;
}

export function ScrambleText({ text, className, delay = 0, fixedWidth = true }: ScrambleTextProps) {
  const display = useScramble(text, { delay });

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className={fixedWidth ? "inline-block tabular-nums" : undefined}>
        {display}
      </span>
    </span>
  );
}
