"use client";

import dynamic from "next/dynamic";

import { useSceneActive } from "@/lib/experience/use-scene-active";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * Mount point for the hero's 3D environment.
 *
 * This wrapper exists for one structural reason: `next/dynamic` with
 * `ssr: false` is only legal inside a Client Component, and the hero section
 * itself is a server component that ships no JavaScript. So the split lives
 * here — the section renders one small client island, and Three.js, drei and
 * the scene arrive in a separate chunk after the page is interactive.
 *
 * "Should the scene be running at all" is `useSceneActive`'s question — on
 * screen, and in a foreground tab. This file used to hand-roll that pair of
 * observers itself, from before the hook existed; every other scene on the page
 * now shares the hook, and the hero has no reason to answer it differently.
 */

const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  // Deliberately empty. The section has its own gradient and grid behind this
  // layer, so an absent canvas looks like a quiet hero rather than a hole; a
  // spinner here would announce a decoration that nobody asked to wait for.
  loading: () => null,
});

export function HeroCanvas() {
  const reducedMotion = useMotionPreference();
  const [host, active] = useSceneActive<HTMLDivElement>();

  return (
    <div
      ref={host}
      aria-hidden="true"
      // Behind the copy, ignoring the pointer, and masked at the bottom so the
      // scene fades into the page instead of ending on a visible seam.
      className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
    >
      <HeroScene active={active} still={reducedMotion} />
    </div>
  );
}
