"use client";

import dynamic from "next/dynamic";

import { useSceneActive } from "@/lib/experience/use-scene-active";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { cn } from "@/lib/utils/cn";

/**
 * Mount point for the footer planet. Same split as every other scene here:
 * Three.js arrives in its own chunk via `next/dynamic({ssr:false})`, and
 * `useSceneActive` decides whether the render loop runs — which matters more
 * for this one than for any of the others, since the footer is on every page
 * and is off screen for almost all of every visit.
 *
 * Below `sm` the scene is not rendered at all, rather than hidden with a class.
 * A `display: none` canvas still constructs its WebGL context and holds it for
 * the life of the page — on the phones that reach this footer, that is a real
 * context bought for something nobody can see.
 */

const PlanetScene = dynamic(() => import("./planet-scene"), {
  ssr: false,
  loading: () => null,
});

export function PlanetCanvas({ className }: { className?: string }) {
  const reducedMotion = useMotionPreference();
  const wideEnough = useMediaQuery("(min-width: 40rem)");
  const [host, active] = useSceneActive<HTMLDivElement>();

  if (!wideEnough) return null;

  return (
    <div
      ref={host}
      aria-hidden="true"
      className={cn("pointer-events-none relative", className)}
    >
      <PlanetScene active={active} still={reducedMotion} />
    </div>
  );
}
