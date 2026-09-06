"use client";

import { useSyncExternalStore } from "react";

/**
 * Does this visitor ask for reduced motion?
 *
 * Self-contained twin of the host's `use-motion-preference` hook: `src/game`
 * must not import host code, but it must honour the same accessibility
 * contract. The media query subscription starts once, at module scope; every
 * consumer shares it.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

let cachedQuery: MediaQueryList | null = null;

function getMediaQuery(): MediaQueryList | null {
  if (typeof window === "undefined") return null;
  cachedQuery ??= window.matchMedia(QUERY);
  return cachedQuery;
}

function getSnapshot(): boolean {
  return getMediaQuery()?.matches ?? false;
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribe(onStoreChange: () => void): () => void {
  const query = getMediaQuery();
  if (!query) return () => {};
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

export function useMotionPreference(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Non-hook read for systems running inside the frame loop. */
export function prefersReducedMotion(): boolean {
  return getSnapshot();
}
