"use client";

import { useSurpriseEffect } from "@/components/surprise/use-surprise-effects";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

import { livingRiver } from "./living-river";

/**
 * The living river, mounted for real visitors.
 *
 * A Client Component because everything below it is browser-only — WebGL,
 * canvas, pointer events, `requestAnimationFrame` — and none of it can run on
 * the server. It renders `null`: the scene is not React's to own, it is a pair
 * of canvases appended to `<body>` and removed again by the teardown function
 * `useSurpriseEffect` calls on unmount. React's job here is only to decide
 * *whether* it runs.
 *
 * Whether it runs at all is `app/(site)/layout.tsx`'s decision, from the admin
 * switch. Whether it runs *for this reader* is decided here: `prefers-reduced-
 * motion` drops it entirely rather than freezing it, because a single arbitrary
 * frame of a day-cycle is not a design — and because a reader who has asked for
 * less movement should not be handed the most animated thing on the page.
 */
export function LivingRiverBackdrop() {
  const reducedMotion = useMotionPreference();
  useSurpriseEffect(livingRiver, !reducedMotion);
  return null;
}
