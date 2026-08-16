"use client";

import type { HTMLMotionProps } from "motion/react";
import { createElement, type ElementType, type ReactNode } from "react";

import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

import { motionElement } from "./motion-element";
import { createFadeVariants, type MotionDirection } from "./variants";

/**
 * Entrance animation that runs on mount.
 *
 * Use this for content that is already on screen when the page loads (the
 * hero, an admin panel). For content further down the page use `<Reveal>`,
 * which waits until it scrolls into view.
 */

interface FadeInProps extends Omit<HTMLMotionProps<"div">, "variants" | "initial" | "animate"> {
  children: ReactNode;
  /** Direction the element travels *from*. Default: "up". */
  direction?: MotionDirection;
  /** Seconds to wait before starting. */
  delay?: number;
  /** Multiplier on the travel distance. */
  distance?: number;
  /** Render as a different element — e.g. "section", "li", "span". */
  as?: ElementType;
}

export function FadeIn({
  children,
  direction = "up",
  delay = 0,
  distance = 1,
  as = "div",
  ...props
}: FadeInProps) {
  const reducedMotion = useMotionPreference();
  const variants = createFadeVariants(direction, reducedMotion, distance);

  // `createElement` rather than JSX: the element type comes from a lookup, and
  // writing it as `<Component>` reads as a component defined during render even
  // though `motionElement` returns a stable module-scoped instance.
  return createElement(
    motionElement(as),
    {
      initial: "hidden",
      animate: "visible",
      variants,
      transition: { delay: reducedMotion ? 0 : delay },
      ...props,
    },
    children,
  );
}
