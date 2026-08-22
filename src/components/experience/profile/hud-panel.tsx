"use client";

import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

import { VIEWPORT } from "@/components/motion/variants";
import { SPRING } from "@/lib/experience/springs";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * One readout panel of the profile.
 *
 * Panels arrive from *different* edges rather than all rising together — the
 * brief's whole objection to the ordinary portfolio is a column of cards fading
 * upward in unison. Direction is a prop so the section can compose an order that
 * reads as a HUD assembling itself.
 *
 * The corner brackets are drawn with borders on four absolutely positioned
 * spans instead of an image or a clip-path, so they inherit the tone colour and
 * cost nothing to theme.
 */

type Edge = "left" | "right" | "top" | "bottom";

const OFFSETS: Record<Edge, { x: number; y: number }> = {
  left: { x: -48, y: 0 },
  right: { x: 48, y: 0 },
  top: { x: 0, y: -36 },
  bottom: { x: 0, y: 36 },
};

function createVariants(from: Edge, reducedMotion: boolean): Variants {
  const offset = OFFSETS[from];

  return {
    hidden: {
      opacity: 0,
      x: reducedMotion ? 0 : offset.x,
      y: reducedMotion ? 0 : offset.y,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      // A spring, not a tween: panels should land with weight, and `SPRING.panel`
      // is the same weight the rest of the interactive layer uses.
      transition: reducedMotion ? { duration: 0.2 } : { type: "spring", ...SPRING.panel },
    },
  };
}

interface HudPanelProps {
  children: ReactNode;
  /** Mono caption in the panel's top-left bracket. */
  label?: string;
  /** Which edge the panel slides in from. */
  from?: Edge;
  delay?: number;
  className?: string;
}

export function HudPanel({ children, label, from = "left", delay = 0, className }: HudPanelProps) {
  const reducedMotion = useMotionPreference();

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={createVariants(from, reducedMotion)}
      transition={{ delay: reducedMotion ? 0 : delay }}
      className={cn(
        "relative border border-border bg-surface/70 p-6 backdrop-blur-sm sm:p-8",
        className,
      )}
    >
      <Brackets />

      {label ? (
        <p className="label-mono mb-4 flex items-center gap-2.5 text-tone">
          <span aria-hidden="true" className="size-1.5 bg-tone" />
          {label}
        </p>
      ) : null}

      {children}
    </motion.div>
  );
}

/** Four L-shaped corner marks — the HUD's frame, and pure decoration. */
function Brackets() {
  return (
    <span aria-hidden="true">
      <span className="absolute -top-px -left-px size-3 border-t border-l border-tone" />
      <span className="absolute -top-px -right-px size-3 border-t border-r border-tone" />
      <span className="absolute -bottom-px -left-px size-3 border-b border-l border-tone" />
      <span className="absolute -right-px -bottom-px size-3 border-r border-b border-tone" />
    </span>
  );
}
