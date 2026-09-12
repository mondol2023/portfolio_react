"use client";

import { usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";

import { DEFAULT_TONE, isSectionTone, type SectionTone } from "@/lib/constants/section-tone";

/**
 * Where is the reader, and how far through the page are they?
 *
 * Single source of truth for "current section", shared by the 2D ambient
 * backdrop (`ambient-background.tsx`) and the persistent 3D scene
 * (`src/three/scene/scene-root.tsx`). Both need the same eyeline signal, and a
 * second independent `IntersectionObserver` over the same anchors would risk
 * the two disagreeing for a frame — or drifting apart entirely under future
 * edits. The eyeline test (a thin band across the viewport's middle) is
 * unchanged from the ambient background's original implementation.
 *
 * `progress` adds a continuous 0..1 read of scroll through the whole
 * document, independent of section boundaries — camera choreography needs a
 * smooth value to interpolate against, not a step function.
 *
 * Implemented as a module-scope external store (mirroring `use-scene-budget`
 * and `use-motion-preference`) rather than per-hook state, so the DOM only
 * ever carries one observer and one scroll listener no matter how many
 * components call this hook.
 */

const MIDDLE_BAND = "-45% 0px -45% 0px";

export interface SceneProgress {
  /** Tone of whichever section currently sits under the reader's eyeline. */
  tone: SectionTone;
  /** DOM id of that section, or null before the observer has reported. */
  sectionId: string | null;
  /** That section's position among all tracked sections, 0-based; -1 before ready. */
  index: number;
  /** Total tracked sections on this route. */
  count: number;
  /** Continuous scroll position through the whole document: 0 at top, 1 at bottom. */
  progress: number;
}

interface Store extends SceneProgress {
  path: string;
}

/** Stable reference for a route with nothing observed yet, and for the server snapshot. */
const FALLBACK: Store = { path: "", tone: DEFAULT_TONE, sectionId: null, index: -1, count: 0, progress: 0 };

let store: Store = FALLBACK;
const listeners = new Set<() => void>();
let startedPath: string | null = null;
let teardown: (() => void) | null = null;

function notify() {
  for (const listener of listeners) listener();
}

function start(pathname: string) {
  if (startedPath === pathname) return;
  teardown?.();

  startedPath = pathname;
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-tone-anchor]"));
  store = { path: pathname, tone: DEFAULT_TONE, sectionId: null, index: -1, count: sections.length, progress: store.progress };

  const disposers: Array<() => void> = [];

  if (sections.length > 0) {
    const inBand = new Set<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) inBand.add(entry.target);
          else inBand.delete(entry.target);
        }

        // Document order breaks the tie while two sections share the band.
        const index = sections.findIndex((section) => inBand.has(section));
        const current = index >= 0 ? sections[index] : null;
        // No match means the reader is between sections; holding the last
        // tone is calmer than snapping back to the default and out again.
        if (current && isSectionTone(current.dataset.tone)) {
          store = { ...store, tone: current.dataset.tone, sectionId: current.id || null, index };
          notify();
        }
      },
      { rootMargin: MIDDLE_BAND, threshold: 0 },
    );

    for (const section of sections) observer.observe(section);
    disposers.push(() => observer.disconnect());
  }

  function onScroll() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const next = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (next !== store.progress) {
      store = { ...store, progress: next };
      notify();
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  disposers.push(() => window.removeEventListener("scroll", onScroll));

  teardown = () => {
    for (const dispose of disposers) dispose();
    startedPath = null;
    teardown = null;
  };
}

function subscribe(pathname: string, onStoreChange: () => void): () => void {
  start(pathname);
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0) teardown?.();
  };
}

function getSnapshot(pathname: string): Store {
  return store.path === pathname ? store : FALLBACK;
}

function getServerSnapshot(): Store {
  return FALLBACK;
}

export function useSceneProgress(): SceneProgress {
  const pathname = usePathname();

  const subscribeFn = useCallback((onStoreChange: () => void) => subscribe(pathname, onStoreChange), [pathname]);
  const getSnapshotFn = useCallback(() => getSnapshot(pathname), [pathname]);

  return useSyncExternalStore(subscribeFn, getSnapshotFn, getServerSnapshot);
}
