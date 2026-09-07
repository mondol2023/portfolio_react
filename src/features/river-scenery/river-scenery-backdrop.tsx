"use client";

import { useSurpriseEffect } from "@/components/surprise/use-surprise-effects";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

import { riverPath } from "./river-path";

/**
 * The site's persistent backdrop — river-path, worn all the time.
 *
 * `river-path` used to be something the surprise button rolled up occasionally
 * (it still can — see `@/components/surprise/effects`). This component is the
 * other consumer promised in this folder's README: it runs the exact same
 * effect unconditionally, via the same `start()`/teardown contract every other
 * consumer uses, so there is exactly one implementation of the scene to keep
 * correct.
 *
 * Mounted once in `app/(site)/layout.tsx`, above `<AmbientBackground />`
 * (`LAYER.backdrop` is -8, `.ambient` is -10) — the two composite rather than
 * one replacing the other: `AmbientBackground` keeps doing section-tone colour
 * and the light/dark rays-or-stars toggle, and river-path draws the scene on
 * top of it, both still entirely behind the page's content.
 *
 * Reduced motion drops it outright rather than freezing it mid-cycle: the same
 * rule `SiteAnimations` applies to every `animated` effect, and a static single
 * frame of a day-cycle is an arbitrary frame, not a design.
 */
export function RiverSceneryBackdrop() {
  const reducedMotion = useMotionPreference();
  useSurpriseEffect(riverPath, !reducedMotion);
  return null;
}
