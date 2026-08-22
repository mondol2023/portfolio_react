"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef, type PointerEvent, type ReactNode } from "react";

import { SPRING } from "@/lib/experience/springs";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Magnetic hover, as one primitive.
 *
 * Anything wrapped in this leans toward the pointer while it is over it and
 * springs back when it leaves, optionally tilting in 3D as it goes. The whole
 * site's magnetism lives here so the pull feels identical on a dock shortcut, a
 * submit button and a project card — the alternative is six components each
 * inventing their own multiplier.
 *
 * The element itself is not the transform target: a `motion.span` wraps the
 * children and moves them. That keeps the layout box exactly where it was, so
 * an element leaning toward the cursor never nudges its neighbours or changes
 * its own hit area mid-hover.
 */

interface MagneticProps {
  children: ReactNode;
  /** How far the content follows the pointer, as a fraction of the offset. */
  strength?: number;
  /** Maximum tilt in degrees. 0 keeps it flat. */
  tilt?: number;
  className?: string;
}

export function Magnetic({ children, strength = 0.32, tilt = 0, className }: MagneticProps) {
  const reducedMotion = useMotionPreference();
  const ref = useRef<HTMLSpanElement>(null);

  // -1..1 across the element, so the tilt maths is resolution-independent.
  const normalX = useMotionValue(0);
  const normalY = useMotionValue(0);
  const offsetX = useMotionValue(0);
  const offsetY = useMotionValue(0);

  const x = useSpring(offsetX, SPRING.snappy);
  const y = useSpring(offsetY, SPRING.snappy);
  // Y-offset drives rotateX and X-offset drives rotateY: pushing the top of a
  // card away means rotating about the horizontal axis.
  const rotateX = useSpring(useTransform(normalY, [-1, 1], [tilt, -tilt]), SPRING.snappy);
  const rotateY = useSpring(useTransform(normalX, [-1, 1], [-tilt, tilt]), SPRING.snappy);

  function handleMove(event: PointerEvent<HTMLSpanElement>) {
    const node = ref.current;
    if (!node || reducedMotion) return;

    const rect = node.getBoundingClientRect();
    const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

    normalX.set(dx);
    normalY.set(dy);
    offsetX.set((dx * rect.width * strength) / 2);
    offsetY.set((dy * rect.height * strength) / 2);
  }

  function handleLeave() {
    normalX.set(0);
    normalY.set(0);
    offsetX.set(0);
    offsetY.set(0);
  }

  return (
    <span
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={className}
      style={{ display: "inline-block", perspective: tilt ? 600 : undefined }}
    >
      <motion.span
        style={{
          display: "inline-block",
          x,
          y,
          rotateX: tilt ? rotateX : undefined,
          rotateY: tilt ? rotateY : undefined,
          transformStyle: tilt ? "preserve-3d" : undefined,
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}
