"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";

import { SPRING } from "@/lib/experience/springs";
import { useFinePointer } from "@/lib/hooks/use-media-query";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * A surface that rotates in 3D toward the pointer.
 *
 * Distinct from `<Magnetic>`, which moves an element *toward* the cursor
 * without changing what it is made of. This one stays put and turns, and it
 * establishes a 3D context its children can sit inside at different depths —
 * which is what makes the contents parallax against each other rather than
 * riding on one flat plane. The player card, the timeline cards and the project
 * cartridges all want that same behaviour, so it lives here rather than three
 * times over.
 *
 * Rotation is driven from a ref-measured rect on each move rather than from a
 * stored size. A card that has just animated in, or one inside a pane that
 * scrolls under it, would otherwise tilt around where it used to be.
 */

interface TiltCardProps {
  children: ReactNode;
  /** Maximum rotation in degrees at the corners. */
  max?: number;
  /** Adds a light sweep that tracks the pointer across the surface. */
  glare?: boolean;
  className?: string;
}

export function TiltCard({ children, max = 9, glare = false, className }: TiltCardProps) {
  const reducedMotion = useMotionPreference();
  const finePointer = useFinePointer();
  const ref = useRef<HTMLDivElement>(null);

  // -1..1 across the card, so the maths is independent of its size.
  const normalX = useMotionValue(0);
  const normalY = useMotionValue(0);

  const rotateX = useSpring(useTransform(normalY, [-1, 1], [max, -max]), SPRING.panel);
  const rotateY = useSpring(useTransform(normalX, [-1, 1], [-max, max]), SPRING.panel);

  // Percentages for the glare's centre. Springs so the highlight glides rather
  // than snapping between samples on a low-frequency pointer.
  const glareX = useSpring(useTransform(normalX, [-1, 1], [0, 100]), SPRING.rail);
  const glareY = useSpring(useTransform(normalY, [-1, 1], [0, 100]), SPRING.rail);
  const glareBackground = useMotionTemplate`radial-gradient(40% 55% at ${glareX}% ${glareY}%, var(--tone-soft), transparent 70%)`;

  const inert = reducedMotion || !finePointer;

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node || inert) return;

    const rect = node.getBoundingClientRect();
    normalX.set((event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2));
    normalY.set((event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2));
  }

  function handleLeave() {
    normalX.set(0);
    normalY.set(0);
  }

  if (inert) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    // The perspective lives on a wrapper rather than on the rotating element:
    // applied to the element itself it would be measured from that element's
    // own centre after rotation, which flattens the effect.
    <div style={{ perspective: 900 }} className={cn("relative", className)}>
      <motion.div
        ref={ref}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative size-full"
      >
        {children}
        {glare ? (
          <motion.span
            aria-hidden="true"
            style={{ background: glareBackground }}
            className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-plus-lighter"
          />
        ) : null}
      </motion.div>
    </div>
  );
}

/**
 * Lifts its children out of the card's surface.
 *
 * Only meaningful inside a `<TiltCard>` — outside one there is no 3D context
 * and `translateZ` collapses to nothing, which is the correct no-op rather than
 * a broken layout.
 */
export function TiltLayer({
  children,
  depth = 20,
  className,
}: {
  children: ReactNode;
  /** Pixels toward the viewer. Larger travels further as the card turns. */
  depth?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ transform: `translateZ(${depth}px)`, transformStyle: "preserve-3d" } as CSSProperties}
    >
      {children}
    </div>
  );
}
