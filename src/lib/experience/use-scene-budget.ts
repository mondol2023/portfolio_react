"use client";

import { useSyncExternalStore } from "react";

import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import { DEFAULT_BUDGET, budgetFor, detectTier, stillBudget, type SceneBudget } from "./device-tier";

/**
 * The scene budget for the current device and motion preference.
 *
 * Every signal detection reads (`deviceMemory`, `hardwareConcurrency`,
 * `matchMedia`, `innerWidth`) is browser-only, so reading it during render
 * would produce server and client markup that disagree. `useSyncExternalStore`
 * is the sanctioned way through that: the server and the hydrating render both
 * see `DEFAULT_BUDGET`, and the real budget is adopted immediately afterwards
 * without a state write inside an effect.
 *
 * The result is memoised at module scope because `getSnapshot` must return a
 * stable reference — recomputing the object per call would spin React forever.
 */

let detected: SceneBudget | null = null;

function getSnapshot(): SceneBudget {
  detected ??= budgetFor(detectTier());
  return detected;
}

function getServerSnapshot(): SceneBudget {
  return DEFAULT_BUDGET;
}

/**
 * Hardware does not change mid-session, so there is nothing to subscribe to.
 * A viewport resize can cross the phone threshold, but re-tiering a live scene
 * would rebuild every buffer mid-animation — a far worse artefact than a
 * rotated phone keeping the budget it started with.
 */
function subscribe(): () => void {
  return () => {};
}

export function useSceneBudget(): SceneBudget {
  const budget = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const reducedMotion = useMotionPreference();

  return reducedMotion ? stillBudget(budget) : budget;
}
