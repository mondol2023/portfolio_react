"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

import { EASE_OUT } from "@/components/motion/variants";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * A statistic that counts up to its value when it scrolls into view.
 *
 * The values are owner-entered free text — `12`, `12+`, `5 yrs`, `~40%`, `1.5M`
 * — so this cannot assume a number. It splits the string into a leading
 * non-numeric part, a number, and a trailing part, animates only the middle,
 * and renders anything it cannot parse verbatim. A statistic that reads
 * "several" should still appear; it just will not tick.
 *
 * Screen readers get the final string immediately from an `sr-only` copy. A
 * live region counting from zero would announce forty intermediate values.
 */

const DURATION = 1.6;

interface ParsedValue {
  prefix: string;
  number: number;
  suffix: string;
  /** Decimal places in the source, so `1.5` does not animate through `1.4732`. */
  decimals: number;
}

function parse(value: string): ParsedValue | null {
  const match = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/s.exec(value);
  if (!match) return null;

  const [, prefix = "", digits = "", suffix = ""] = match;
  const number = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(number)) return null;

  return { prefix, number, suffix, decimals: digits.split(".")[1]?.length ?? 0 };
}

export function StatCounter({ value, className }: { value: string; className?: string }) {
  const reducedMotion = useMotionPreference();
  const ref = useRef<HTMLSpanElement>(null);
  // `once`, and at the same threshold the rest of the site reveals at, so the
  // count starts when the panel it sits in has actually arrived.
  const inView = useInView(ref, { once: true, amount: 0.5 });

  const parsed = parse(value);
  const target = parsed?.number ?? 0;
  const decimals = parsed?.decimals ?? 0;

  const count = useMotionValue(0);
  const display = useTransform(count, (latest) =>
    latest.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
  );

  useEffect(() => {
    if (!inView || !parsed) return;

    if (reducedMotion) {
      count.set(target);
      return;
    }

    const controls = animate(count, target, { duration: DURATION, ease: EASE_OUT });
    return () => controls.stop();
  }, [inView, parsed, reducedMotion, count, target]);

  if (!parsed) {
    return (
      <span ref={ref} className={className}>
        {value}
      </span>
    );
  }

  return (
    <span ref={ref} className={className}>
      {/* `tabular-nums` so the box does not breathe as digits change width. */}
      <span aria-hidden="true" className="tabular-nums">
        {parsed.prefix}
        <motion.span>{display}</motion.span>
        {parsed.suffix}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
