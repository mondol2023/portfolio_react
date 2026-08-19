"use client";

import { useMemo } from "react";

import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

import { resolveAnimations } from "./catalog";
import { useSurpriseEffects } from "./use-surprise-effects";

/**
 * The animations the dashboard has switched on, worn permanently.
 *
 * Same effects the surprise button draws from, mounted a different way: the
 * button plays a random set for as long as the reader leaves it up, this holds
 * a chosen set for everyone until the admin turns it off. Both go through
 * `useSurpriseEffects`, so turning one off runs the same undo the button's
 * reset does and the page is left exactly as it was found.
 *
 * Renders nothing. Every effect mounts its own layer on `<body>` and styles the
 * page from `<head>`, so there is no element for this component to be.
 */

interface SiteAnimationsProps {
  /** Effect ids, as stored by the dashboard. Unknown ids are ignored. */
  ids: readonly string[];
}

export function SiteAnimations({ ids }: SiteAnimationsProps) {
  const still = useMotionPreference();

  /*
   * Keyed on the joined ids rather than the array itself: `ids` arrives from a
   * Server Component and is a new array on every render, which would tear down
   * and restart every effect each time the tree re-renders.
   */
  const key = ids.join(",");

  const effects = useMemo(() => {
    const chosen = resolveAnimations(key === "" ? [] : key.split(","));

    // Reduced motion drops the moving ones outright — the same rule the button
    // plays by. A pinned animation the reader asked not to see is still one
    // they asked not to see.
    return still ? chosen.filter((effect) => !effect.animated) : chosen;
  }, [key, still]);

  useSurpriseEffects(effects);

  return null;
}
