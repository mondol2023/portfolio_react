"use client";

import { useEffect, useRef } from "react";

import { registerVeilTarget } from "@/lib/experience/scenery-transition";
import { useSceneTone } from "@/lib/experience/use-scene-progress";

/**
 * Animated backdrop for the public site.
 *
 * Two things are going on:
 *
 * 1. **Theme.** The same three drifting colour fields render in both themes,
 *    but light mode adds soft angled light shafts and dark mode a slow star
 *    field. Both layers are always in the DOM and switched with `opacity` in
 *    CSS (`.dark .ambient-rays` / `.dark .ambient-stars`), so nothing here has
 *    to read the theme — which also means no wrong-mode flash on hydration.
 *
 * 2. **Section colour.** Whichever section is crossing the middle of the
 *    viewport hands its `data-tone` to the backdrop, and the registered
 *    `--tone` / `--tone-soft` properties cross-fade to it over ~900ms. The
 *    background is therefore tinted by wherever the reader currently is.
 *
 * The "current section" signal itself lives in `use-scene-progress.ts` —
 * shared with the persistent 3D scene so both layers agree on where the reader
 * is rather than each running its own `IntersectionObserver`.
 *
 * 3. **Scenery.** Registers itself with `scenery-transition.ts` (Phase K) as
 *    one of the two things the crossfade dips — S13 called this "the visible
 *    half", so a scenery switch that faded only the canvas would fade the
 *    less visible one. The registration is a plain ref, not a store
 *    subscription: this component still reads nothing but `data-tone`/
 *    `data-scenery` and never re-renders on a switch.
 */
export function AmbientBackground() {
  const tone = useSceneTone();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return registerVeilTarget(el);
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="ambient" data-tone={tone}>
      <div className="ambient-blob ambient-blob-a" />
      <div className="ambient-blob ambient-blob-b" />
      <div className="ambient-blob ambient-blob-c" />
      <div className="ambient-rays" />
      <div className="ambient-stars" />
    </div>
  );
}
