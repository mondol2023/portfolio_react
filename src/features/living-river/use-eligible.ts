"use client";

import { useSyncExternalStore } from "react";

import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

import { createGLContext } from "./gl/context";

/**
 * Whether this visitor can be handed the living river at all.
 *
 * The admin flag only says the *site* is allowed to show it; this is the
 * per-visitor half — viewport, pointer, a real WebGL2 context, `deviceMemory`
 * — that the server rendering the page cannot answer. `SceneryGate` uses the
 * result to choose between this and `SectionScenery`, so every "no" here has
 * to have a fallback, not a gap.
 *
 * Built the same way `useMotionPreference` is (`useSyncExternalStore`, a
 * server snapshot of `false`) rather than `useState` + `useEffect`, and for
 * the same reason: the answer is allowed to differ between the server render
 * and this client, and that hook shape is the one already proven here not to
 * fight React over it.
 */

/**
 * `lg` and up, with a pointer that can hover — the same shape of query
 * `card-tilt.ts` already gates on. A touch tablet reporting a 1024px-wide
 * viewport is still a tablet: `pointer: fine` / `hover: hover` is what
 * actually tells a laptop apart from one, without a user-agent list.
 */
const DESKTOP_QUERY = "(min-width: 1024px) and (pointer: fine) and (hover: hover)";

/**
 * Chrome and Lighthouse both use 4GB as the line between "capable" and
 * "low-end". `deviceMemory` is Chromium-only — Safari and Firefox never
 * report it — so its absence means "unknown", not "low-power"; only an
 * actual low reading disqualifies a device.
 */
const LOW_MEMORY_GB = 4;

function isLowPower(): boolean {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return typeof memory === "number" && memory < LOW_MEMORY_GB;
}

/**
 * A real WebGL2 context, created on a throwaway canvas and released straight
 * away. `createGLContext` is the exact probe the renderer itself uses to
 * decide whether to draw water at all, so a "yes" here is the renderer's own
 * success condition, checked before committing to mount it — not a guess at
 * one remove from it.
 */
function hasWebGL2(): boolean {
  const canvas = document.createElement("canvas");
  const context = createGLContext(canvas);
  if (!context) return false;

  context.gl.getExtension("WEBGL_lose_context")?.loseContext();
  return context.isWebGL2;
}

/**
 * Computed once and cached for the life of the tab: none of the signals above
 * change while it's open, and the WebGL probe — cheap, but not free — has no
 * reason to run more than once. `null` means "not computed yet", distinct
 * from the `false` a real check can return.
 */
let cached: boolean | null = null;

function computeCapability(): boolean {
  if (cached === null) {
    cached =
      typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia(DESKTOP_QUERY).matches &&
      !isLowPower() &&
      hasWebGL2();
  }
  return cached;
}

function getServerSnapshot(): boolean {
  return false;
}

/** No native "capability changed" event exists to subscribe to, and none of
 *  these signals are expected to change mid-session — see the caching note
 *  above. `useSyncExternalStore` still wants a subscribe function; this one
 *  simply never fires. */
function subscribe(): () => void {
  return () => {};
}

/**
 * `enabled` (the admin flag) and reduced motion gate whether the probe runs
 * at all, not just the final answer — a visitor this can never be shown to
 * should not pay for the WebGL context it would have created to find out.
 *
 * `useHydrated` is what makes that true rather than merely intended.
 * `useMotionPreference` answers `false` during the hydration render by
 * design — its server snapshot has to match the HTML — so without this guard
 * a reduced-motion visitor still reached `hasWebGL2()` in that window and
 * paid for a real WebGL2 context before the correction arrived. Waiting one
 * render costs a motion-allowing visitor nothing (the probe is cached for the
 * life of the tab either way) and costs a reduced-motion visitor the whole
 * probe, which is the point.
 */
export function useLivingRiverEligible(enabled: boolean): boolean {
  const hydrated = useHydrated();
  const reducedMotion = useMotionPreference();
  const shouldProbe = enabled && hydrated && !reducedMotion;

  return useSyncExternalStore(
    subscribe,
    () => (shouldProbe ? computeCapability() : false),
    getServerSnapshot,
  );
}
