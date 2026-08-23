"use client";

import type { MotionValue } from "motion/react";
import dynamic from "next/dynamic";

import { useSceneActive } from "@/lib/experience/use-scene-active";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Mount point for the timeline's 3D tunnel.
 *
 * Same split as `HeroCanvas`: the section that renders this is a client
 * component already (it owns the era-tracking state), but Three.js and the
 * scene itself still arrive in a separate chunk via `next/dynamic` with
 * `ssr: false`, and `useSceneActive` decides whether the render loop should
 * be running at all — off-screen or in a background tab, it isn't.
 */

const TimelineScene = dynamic(() => import("./timeline-scene"), {
  ssr: false,
  // The DOM timeline has its own background and rail, so an absent canvas
  // reads as a quiet section rather than a hole.
  loading: () => null,
});

interface TimelineCanvasProps {
  eraIndex: number;
  eraCount: number;
  velocity: MotionValue<number>;
}

export function TimelineCanvas({ eraIndex, eraCount, velocity }: TimelineCanvasProps) {
  const reducedMotion = useMotionPreference();
  const [host, active] = useSceneActive<HTMLDivElement>();

  return (
    <div
      ref={host}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)]"
    >
      <TimelineScene
        active={active}
        still={reducedMotion}
        eraIndex={eraIndex}
        eraCount={eraCount}
        velocity={velocity}
      />
    </div>
  );
}
