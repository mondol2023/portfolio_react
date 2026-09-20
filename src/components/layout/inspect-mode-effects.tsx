"use client";

import { useEffect } from "react";

import { useSceneInspectStore } from "@/lib/store/scene-inspect-store";

/**
 * The DOM half of Inspect mode (§6.3, Phase G) — everything `scene-root.tsx`'s
 * canvas-side pointer-events toggle does not cover. Freezes the page (the
 * same `document.body.style.overflow` toggle `mobile-menu.tsx` already uses
 * for a modal), dims the content behind the orbit via `data-scene-inspecting`
 * on `<html>` (`globals.css` reads it, same contract as `data-scenery`), and
 * gives Escape and a visible affordance to leave — the free orbit has no
 * other way out once the canvas has taken the pointer.
 */
export function InspectModeEffects() {
  const active = useSceneInspectStore((state) => state.active);
  const exit = useSceneInspectStore((state) => state.exit);

  useEffect(() => {
    if (!active) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.dataset.sceneInspecting = "true";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") exit();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      delete document.documentElement.dataset.sceneInspecting;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active, exit]);

  if (!active) return null;

  return (
    <button
      type="button"
      onClick={exit}
      className="fixed right-4 bottom-4 z-50 rounded-full border border-border bg-surface-raised px-4 py-2 text-xs font-medium text-fg shadow-floating"
    >
      Exit inspect (Esc)
    </button>
  );
}
