"use client";

import { useEffect } from "react";

import { readStoredScenery, useSceneSceneryStore } from "@/lib/store/scene-scenery-store";

interface SceneryControllerProps {
  /** The `three-scenery` admin flag, resolved server-side in `(site)/layout.tsx`. */
  enabled: boolean;
}

/**
 * Renders nothing. Reads `localStorage` post-mount (S2) — never during
 * render, since the server can't know it and a mismatch would hydrate-error
 * — and applies it to the store, or pins `atelier` when the admin flag is
 * off. Mounted once, unconditionally, so `data-scenery` stays correct even
 * on a page that never renders the picker itself.
 *
 * Always `setSceneryInstant` here, never the animated `setScenery` (Phase K):
 * this runs on page load, not a user gesture, and there is no "from" world
 * for a 900ms crossfade to have come from.
 */
export function SceneryController({ enabled }: SceneryControllerProps) {
  useEffect(() => {
    if (!enabled) {
      useSceneSceneryStore.getState().pinAtelier();
      return;
    }

    const stored = readStoredScenery();
    if (stored) useSceneSceneryStore.getState().setSceneryInstant(stored);
  }, [enabled]);

  return null;
}
