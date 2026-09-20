"use client";

import type { HTMLMotionProps } from "motion/react";
import { createElement, type ElementType, type ReactNode } from "react";

import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { useSceneSceneryStore } from "@/lib/store/scene-scenery-store";

import { motionElement } from "./motion-element";
import {
  VIEWPORT,
  createFadeVariants,
  createStaggerVariants,
  type MotionDirection,
} from "./variants";

/**
 * A parent/child pair for sequencing a list.
 *
 * `<Stagger>` owns the timing and animates nothing itself; each `<StaggerItem>`
 * inherits the `hidden` / `visible` state from it. This is why lists here do
 * not need per-item delay arithmetic — adding an item is enough.
 */

interface StaggerProps extends Omit<HTMLMotionProps<"div">, "variants" | "initial"> {
  children: ReactNode;
  /** Seconds between each child. */
  step?: number;
  /** Seconds to wait before the first child. */
  delayChildren?: number;
  /** Start on mount instead of waiting for the element to scroll into view. */
  triggerOnMount?: boolean;
  as?: ElementType;
}

export function Stagger({
  children,
  step,
  delayChildren = 0,
  triggerOnMount = false,
  as = "div",
  ...props
}: StaggerProps) {
  const reducedMotion = useMotionPreference();
  const variants = createStaggerVariants(reducedMotion, step, delayChildren);

  const trigger = triggerOnMount
    ? { animate: "visible" as const }
    : { whileInView: "visible" as const, viewport: VIEWPORT };

  // See the note in `fade-in.tsx` on why this is `createElement` and not JSX.
  return createElement(
    motionElement(as),
    { initial: "hidden", variants, ...trigger, ...props },
    children,
  );
}

interface StaggerItemProps extends Omit<HTMLMotionProps<"div">, "variants"> {
  children: ReactNode;
  direction?: MotionDirection;
  distance?: number;
  as?: ElementType;
}

export function StaggerItem({
  children,
  direction = "up",
  distance = 1,
  as = "div",
  ...props
}: StaggerItemProps) {
  const reducedMotion = useMotionPreference();
  // Same per-world pace as `Reveal` — a list item and a block that enter side
  // by side must not disagree about how fast this world moves.
  const entrance = useSceneSceneryStore((state) => state.renderScenery.entrance);
  const variants = createFadeVariants(direction, reducedMotion, distance, entrance);

  return createElement(motionElement(as), { variants, ...props }, children);
}
