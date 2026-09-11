"use client";

import { useEffect } from "react";

import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

import { createGLContext } from "./gl/context";
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
 * Whether it runs at all is `app/(site)/layout.tsx`'s (by way of
 * `SceneryGate`'s eligibility check) decision. Whether it runs *for this
 * reader* is decided here: `prefers-reduced-motion` drops it entirely rather
 * than freezing it, because a single arbitrary frame of a day-cycle is not a
 * design — and because a reader who has asked for less movement should not be
 * handed the most animated thing on the page.
 *
 * One more check happens here, immediately before the real mount: a throwaway
 * WebGL2 context, the same probe `SceneryGate` already ran to decide this
 * component was worth rendering at all. Re-running it costs one disposable
 * canvas and closes a real, if rare, gap — a driver reset, a context budget
 * another tab just used up — between that decision and this one. Failing it
 * calls `onUnavailable` and never starts `livingRiver`, so the caller can
 * swap to `SectionScenery` rather than the reader ending up with an empty
 * backdrop and nothing above it. Started directly here, one effect, rather
 * than through `useSurpriseEffect`: the extra guard clause below means
 * "should this run" is no longer just `!reducedMotion`.
 */
export function LivingRiverBackdrop({ onUnavailable }: { onUnavailable?: () => void }) {
  const reducedMotion = useMotionPreference();

  useEffect(() => {
    if (reducedMotion) return;

    const probe = document.createElement("canvas");
    const context = createGLContext(probe);
    if (!context || !context.isWebGL2) {
      onUnavailable?.();
      return;
    }

    return livingRiver.start();
  }, [reducedMotion, onUnavailable]);

  return null;
}
