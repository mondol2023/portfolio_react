"use client";

import { useSyncExternalStore } from "react";

/**
 * Tracks `prefers-reduced-motion`.
 *
 * The CSS in `globals.css` already shortens transitions, but that only makes
 * motion *fast* — it still moves. Components read this hook to drop transforms
 * altogether so an entrance becomes a plain appearance.
 *
 * `useSyncExternalStore` keeps the server snapshot (`false`) and the first
 * client render consistent, and re-renders if the user flips the OS setting
 * mid-session.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};

  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/** Server render assumes motion is allowed; the client corrects on hydration. */
function getServerSnapshot(): boolean {
  return false;
}

export function useMotionPreference(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
