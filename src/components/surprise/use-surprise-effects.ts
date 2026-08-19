"use client";

import { useEffect } from "react";

import type { SurpriseEffect } from "./effect";

/**
 * React bindings for the surprise kit.
 *
 * Kept apart from `./effect.ts` for one specific reason: these are hooks, so
 * this file has to be a Client Component module, and anything a Client
 * Component module imports is dragged into the client boundary with it. The
 * effects themselves are plain modules — no React, nothing that runs at import
 * time — which lets a Server Component read the registry's ids and labels to
 * build a list (see `./catalog.ts` and the admin dashboard). Marking the shared
 * contract as client would have made that read a build error.
 *
 * Neither hook is required to use an effect. `effect.start()` returns its own
 * undo and works anywhere; these just tie that pair to a component's lifetime.
 */

/**
 * Runs a single effect for as long as `active` stays true.
 *
 * One line in any client component turns one effect on, and unmounting turns it
 * off. For several at once, see `useSurpriseEffects`.
 */
export function useSurpriseEffect(effect: SurpriseEffect | null, active = true): void {
  useEffect(() => {
    if (!effect || !active) return;
    return effect.start();
  }, [effect, active]);
}

/**
 * Runs several effects at once.
 *
 * Pass a stable array — a new array literal on every render would tear the
 * whole set down and rebuild it each time. Teardown runs in reverse, so an
 * effect that layered itself over another is lifted off first.
 */
export function useSurpriseEffects(effects: readonly SurpriseEffect[], active = true): void {
  useEffect(() => {
    if (!active || effects.length === 0) return;

    const stops = effects.map((effect) => effect.start());

    return () => {
      for (let i = stops.length - 1; i >= 0; i -= 1) stops[i]?.();
    };
  }, [effects, active]);
}
