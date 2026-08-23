"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";

import { useScramble } from "@/lib/experience/use-scramble";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * `SYSTEM STATUS: ONLINE`.
 *
 * It reports something true rather than printing a slogan: the readout only
 * says ONLINE once the page has actually hydrated, which is the moment the
 * interactive half of this site exists. Before that — and for anyone who never
 * gets JavaScript — it renders STATIC, because the document is still there and
 * still readable, and claiming a live system that is not running would be the
 * one piece of fiction on the page that costs the reader something.
 */
export function SystemStatus({ className }: { className?: string }) {
  const hydrated = useHydrated();
  const reducedMotion = useMotionPreference();
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  const label = hydrated ? "ONLINE" : "STATIC";
  const resolved = useScramble(label, { active: hydrated && inView, step: 0.03 });

  return (
    <p
      ref={ref}
      className={cn(
        "flex items-center gap-2.5 font-mono text-[11px] tracking-[0.24em] uppercase",
        className,
      )}
    >
      <span className="text-fg-subtle">System status</span>

      <motion.span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", hydrated ? "bg-tone" : "bg-fg-subtle")}
        animate={hydrated && !reducedMotion ? { opacity: [1, 0.2, 1] } : { opacity: 1 }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* The scramble is decorative — the label is announced once, settled. */}
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className={hydrated ? "text-tone" : "text-fg-muted"}>
        {resolved || label}
      </span>
    </p>
  );
}
