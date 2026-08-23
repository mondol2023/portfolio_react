"use client";

import dynamic from "next/dynamic";

import { useSceneActive } from "@/lib/experience/use-scene-active";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Mount point for the arcade grid's background atmosphere. Same split as
 * `HeroCanvas`/`TimelineCanvas`: Three.js arrives in its own chunk via
 * `next/dynamic({ssr:false})`, `useSceneActive` decides whether the render
 * loop runs.
 */

const ArcadeScene = dynamic(() => import("./arcade-scene"), {
  ssr: false,
  loading: () => null,
});

interface ArcadeCanvasProps {
  /** True while any cartridge in the grid is hovered. */
  hovered: boolean;
}

export function ArcadeCanvas({ hovered }: ArcadeCanvasProps) {
  const reducedMotion = useMotionPreference();
  const [host, active] = useSceneActive<HTMLDivElement>();

  return (
    <div ref={host} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <ArcadeScene active={active} still={reducedMotion} hovered={hovered} />
    </div>
  );
}
