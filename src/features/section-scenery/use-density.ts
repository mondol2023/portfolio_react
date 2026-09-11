"use client";

import { useSyncExternalStore } from "react";

import type { SceneDensity } from "./engine/density";

/**
 * Which workload tier this visitor's SectionScenery should start at.
 *
 * Built the same way `living-river/use-eligible.ts` gates its own renderer —
 * `matchMedia` for the breakpoint (synchronous, and its `change` event is one
 * listener per query rather than a `ResizeObserver` on top of the one the
 * render loop already owns), `navigator.deviceMemory` for the low-power
 * check. That module is Phase 4's capability gate and stays untouched here;
 * this is a small, deliberate copy of the same *approach* — same threshold,
 * same reasoning — for a different feature, not a second competing system.
 *
 * Desktop and tablet are one query apart from living-river's own
 * `(min-width: 1024px)` cutoff on purpose: any viewport wide enough for
 * living-river either gets it (and SectionScenery isn't mounted at all) or
 * fails one of living-river's *other* gates (reduced motion, pointer, WebGL,
 * admin flag) and lands here at the `full` tier — the same one living-river
 * would have used the canvas for.
 */
const MOBILE_QUERY = "(max-width: 767px)";
const DESKTOP_QUERY = "(min-width: 1024px)";

/** Chromium's own "capable vs. low-end" line, same as living-river's gate.
 *  `deviceMemory` is Chromium-only, so absence means "unknown", not
 *  "low-power" — only an actual low reading drops the tier. */
const LOW_MEMORY_GB = 4;

function isLowPowerDevice(): boolean {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof memory === "number" && memory < LOW_MEMORY_GB;
}

/** Computed once per tab — `deviceMemory` does not change while the page is
 *  open, so there is no reason to re-read it on every breakpoint crossing. */
let lowPowerCache: boolean | null = null;

function computeDensity(): SceneDensity {
  if (typeof window === "undefined" || !window.matchMedia) return "full";

  if (lowPowerCache === null) lowPowerCache = isLowPowerDevice();
  if (lowPowerCache) return "minimal";

  if (window.matchMedia(MOBILE_QUERY).matches) return "sparse";
  if (window.matchMedia(DESKTOP_QUERY).matches) return "full";
  return "moderate";
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};

  const mobile = window.matchMedia(MOBILE_QUERY);
  const desktop = window.matchMedia(DESKTOP_QUERY);
  mobile.addEventListener("change", onChange);
  desktop.addEventListener("change", onChange);
  return () => {
    mobile.removeEventListener("change", onChange);
    desktop.removeEventListener("change", onChange);
  };
}

/** Server render assumes the capable desktop case; the client corrects on
 *  hydration, same pattern as `useMotionPreference`. */
function getServerSnapshot(): SceneDensity {
  return "full";
}

export function useSceneryDensity(): SceneDensity {
  return useSyncExternalStore(subscribe, computeDensity, getServerSnapshot);
}
