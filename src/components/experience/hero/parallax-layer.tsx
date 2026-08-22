"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, type ReactNode } from "react";

import { SPRING } from "@/lib/experience/springs";
import { useFinePointer } from "@/lib/hooks/use-media-query";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Moves its children against the pointer, a fraction of the distance.
 *
 * The hero's camera already parallaxes the 3D scene. Without this the copy
 * would sit dead still on top of a world that moves, and the two layers would
 * read as a screenshot with text pasted over it. Giving the DOM a *smaller*
 * shift than the camera's is what puts it in front rather than in it.
 *
 * Subscribes to the pointer directly instead of taking `usePointer`'s ref: this
 * is a Motion value feeding a transform, not a `useFrame` loop, so it needs the
 * push rather than the poll.
 */

interface ParallaxLayerProps {
  children: ReactNode;
  /** Pixels of travel at the edge of the screen. Larger reads as nearer. */
  depth?: number;
  className?: string;
}

export function ParallaxLayer({ children, depth = 12, className }: ParallaxLayerProps) {
  const reducedMotion = useMotionPreference();
  const finePointer = useFinePointer();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING.rail);
  const y = useSpring(rawY, SPRING.rail);

  const inert = reducedMotion || !finePointer;

  useEffect(() => {
    if (inert) return;

    function onMove(event: PointerEvent) {
      const normalX = (event.clientX / window.innerWidth) * 2 - 1;
      const normalY = (event.clientY / window.innerHeight) * 2 - 1;
      // Against the pointer, not with it: the layer leans away as the camera
      // leans in, which is what separates the planes.
      rawX.set(-normalX * depth);
      rawY.set(-normalY * depth);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [inert, depth, rawX, rawY]);

  if (inert) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} style={{ x, y }}>
      {children}
    </motion.div>
  );
}
