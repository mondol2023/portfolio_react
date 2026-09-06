"use client";

import { motion } from "motion/react";

import { COLLECT_FEEL } from "../config/game-config";
import { useMotionPreference } from "../hooks/use-motion-preference";
import { useInteractionStore } from "../stores/interaction-store";

const SIZE = COLLECT_FEEL.ringDiameterPx;
const STROKE = COLLECT_FEEL.ringStrokeWidthPx;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Hold-to-collect charge ring — tracks the pointer while a press builds
 * toward `INTERACTION.longPressMs`, giving the gesture the visible progress
 * it lacked before. Renders nothing outside an active hold.
 *
 * Pure presentation: `GestureController` is the only writer of
 * `collectProgress`/`collectOrigin`, this component only reads. Under reduced
 * motion the ring still reports progress (it's information, not flourish)
 * but snaps instead of easing between frames.
 */
export function CollectRing() {
  const progress = useInteractionStore((state) => state.collectProgress);
  const origin = useInteractionStore((state) => state.collectOrigin);
  const reducedMotion = useMotionPreference();

  if (!origin || progress <= 0) return null;

  return (
    <div
      className="pointer-events-none fixed z-30"
      style={{ left: origin.x, top: origin.y, transform: "translate(-50%, -50%)" }}
      aria-hidden="true"
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-fg/15" />
        <motion.circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="round"
          className="stroke-accent"
          style={{ strokeDasharray: CIRCUMFERENCE, transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
          animate={{ strokeDashoffset: CIRCUMFERENCE * (1 - progress) }}
          transition={{ duration: reducedMotion ? 0 : 0.05, ease: "linear" }}
        />
      </svg>
    </div>
  );
}
