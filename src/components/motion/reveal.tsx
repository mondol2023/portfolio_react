"use client";

import type { HTMLMotionProps } from "motion/react";
import { createElement, type ElementType, type ReactNode } from "react";

import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { useSceneSceneryStore } from "@/lib/store/scene-scenery-store";

import { motionElement } from "./motion-element";
import { VIEWPORT, createFadeVariants, type MotionDirection } from "./variants";

/**
 * Scroll-triggered entrance. Fires once, when a quarter of the element has
 * entered the viewport, and never re-runs — repeat animations on scroll-back
 * are the fastest way to make a page feel restless.
 *
 * Its *pace* follows the active scenery (Part 4) so the page and the canvas
 * behind it move at one speed. `renderScenery`, not `id`: the pace commits on
 * the crossfade's geometry track with everything else, never ahead of it.
 */

interface RevealProps extends Omit<HTMLMotionProps<"div">, "variants" | "initial" | "whileInView"> {
  children: ReactNode;
  direction?: MotionDirection;
  delay?: number;
  distance?: number;
  as?: ElementType;
}

export function Reveal({
  children,
  direction = "up",
  delay = 0,
  distance = 1,
  as = "div",
  ...props
}: RevealProps) {
  const reducedMotion = useMotionPreference();
  const entrance = useSceneSceneryStore((state) => state.renderScenery.entrance);
  const variants = createFadeVariants(direction, reducedMotion, distance, entrance);

  // See the note in `fade-in.tsx` on why this is `createElement` and not JSX.
  return createElement(
    motionElement(as),
    {
      initial: "hidden",
      whileInView: "visible",
      viewport: VIEWPORT,
      variants,
      transition: { delay: reducedMotion ? 0 : delay },
      ...props,
    },
    children,
  );
}
