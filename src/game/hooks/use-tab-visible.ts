"use client";

import { useSyncExternalStore } from "react";

/**
 * Is the tab in front right now?
 *
 * The world spans the whole viewport, so "off-screen" never happens — the
 * only free frame-rate win left is a hidden tab, where rAF throttles anyway
 * but the physics loop and audio would still churn. The canvas drops to
 * `frameloop="never"` while hidden and resumes cleanly on return.
 */
const serverSnapshot = true;

let cached = true;

function getSnapshot(): boolean {
  return cached;
}

function subscribe(onStoreChange: () => void): () => void {
  function onVisibility(): void {
    const visible = document.visibilityState === "visible";
    if (visible !== cached) {
      cached = visible;
      onStoreChange();
    }
  }

  document.addEventListener("visibilitychange", onVisibility);
  return () => document.removeEventListener("visibilitychange", onVisibility);
}

export function useTabVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
}
