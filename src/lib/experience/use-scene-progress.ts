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
 * `progress` adds a continuous 0..1 read of scroll, measured in *section
 * space* rather than raw document pixels — camera choreography needs a smooth
 * value to interpolate against, not a step function, but it also needs that
 * value to line up with the section it is choreographing.
 *
 * Implemented as a module-scope external store (mirroring `use-scene-budget`
 * and `use-motion-preference`) rather than per-hook state, so the DOM only
 * ever carries one observer and one scroll listener no matter how many
 * components call this hook.
 *
 * The two halves of that store leave by different doors, because they change at
 * very different rates. `tone` changes a handful of times per page and is read
 * through React (`useSceneTone`). `progress` changes on every scroll event and
 * is *not*: it is pulled by the scene's frame loop (`getSceneProgress`), which
 * springs it into `scene-scroll.ts`. Routing it through React state instead
 * re-rendered the whole canvas subtree at scroll frequency, which is what the
 * performance contract forbids.
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
  /**
   * Continuous scroll position in section space: 0 at the first section's
   * eyeline, 1 at the last's, and exactly `i / (count - 1)` as section `i`
   * passes the reader's eyeline.
   */
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

/** Document-space y of each tracked section's midpoint, remeasured on layout change. */
let centres: number[] = [];

/** DOM ids of the tracked sections, in document order — `progress`'s implicit index. */
let sectionIds: string[] = [];

/** Subscribers to `progress`, which deliberately never goes through React. */
const progressListeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/**
 * Scroll expressed in section space.
 *
 * The camera path in `camera-rig.tsx` carries one waypoint per section and
 * reads them off `progress * (count - 1)`, which is only correct if every
 * section occupies an equal slice of the document. They do not: on this page
 * Experience is well over twice the height of Skills, and the gap widens
 * again on mobile where cards stack. Measured against raw document scroll the
 * camera therefore arrived at each waypoint somewhere other than the section
 * it belongs to — far enough out that Projects' corridor ran its whole
 * entrance only after the Projects section had scrolled away, and Skills'
 * galaxy was what actually hung over the Projects heading.
 *
 * Interpolating between the section *midpoints* instead pins waypoint `i` to
 * the moment section `i` crosses the reader's eyeline — the same eyeline the
 * `IntersectionObserver` above already uses to pick the tone (hence the
 * half-viewport offset applied to `y` below) — so the choreography lands on
 * the content it was written for at every viewport width, without the camera
 * path needing to know anything about page layout.
 */
function storyProgress(): number {
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  if (max <= 0) return 0;

  // The reader's eyeline, not the viewport's top edge: `centres` are section
  // midpoints in document space, so comparing raw `scrollY` against them landed
  // every waypoint half a viewport late — Hero's sculpture was still ~80%
  // present over Skills' pills, by a different fraction at every viewport
  // height. `MIDDLE_BAND` above is the same half-height offset.
  const y = window.scrollY + doc.clientHeight / 2;
  const last = centres.length - 1;
  // One section (or none) has no span to interpolate across; fall back to the
  // raw document read so the value still moves (no midpoints to offset against).
  if (last < 1) return Math.min(1, Math.max(0, window.scrollY / max));

  const first = centres[0] ?? 0;
  if (y <= first) return 0;
  if (y >= (centres[last] ?? 0)) return 1;

  let i = 0;
  while (i < last && y >= (centres[i + 1] ?? 0)) i += 1;
  const a = centres[i] ?? 0;
  const b = centres[i + 1] ?? a;
  const local = b > a ? (y - a) / (b - a) : 0;
  return (i + local) / last;
}

function start(pathname: string) {
  if (startedPath === pathname) return;
  teardown?.();

  startedPath = pathname;
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-tone-anchor]"));
  sectionIds = sections.map((section) => section.id);
  store = { path: pathname, tone: DEFAULT_TONE, sectionId: null, index: -1, count: sections.length, progress: store.progress };

  const disposers: Array<() => void> = [];

  function measure() {
    const offset = window.scrollY;
    centres = sections.map((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top + offset + rect.height / 2;
    });
  }

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
    const next = storyProgress();
    if (next === store.progress) return;
    // Mutated in place, not replaced: `getSnapshot` hands React the same
    // object, so a scroll cannot re-render anyone. Safe because `start()` has
    // already swapped `store` off the shared `FALLBACK` above.
    store.progress = next;
    for (const listener of progressListeners) listener();
  }

  // Section midpoints are read once per layout change rather than once per
  // scroll event: `getBoundingClientRect()` inside a scroll handler forces a
  // synchronous reflow on every frame of a scroll, which is exactly the cost
  // a single shared store exists to pay only once.
  function remeasure() {
    measure();
    onScroll();
  }

  measure();

  // Content arriving late (projects and experience are fetched, then pushed
  // into the DOM) changes section heights well after mount; observing the
  // document catches that without a second timer.
  const resizeObserver = new ResizeObserver(remeasure);
  resizeObserver.observe(document.documentElement);
  disposers.push(() => resizeObserver.disconnect());

  // A viewport-height change need not resize the document, but it still moves
  // the eyeline — and on mobile the URL bar does it constantly.
  window.addEventListener("resize", remeasure, { passive: true });
  disposers.push(() => window.removeEventListener("resize", remeasure));

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  disposers.push(() => window.removeEventListener("scroll", onScroll));

  teardown = () => {
    for (const dispose of disposers) dispose();
    centres = [];
    sectionIds = [];
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

function getServerTone(): SectionTone {
  return FALLBACK.tone;
}

/**
 * The tone of whichever section sits under the reader's eyeline.
 *
 * Returns the primitive rather than the store object so a `progress` change can
 * never wake a React render — and so mounting this is what starts the single
 * observer every other reader here depends on.
 */
export function useSceneTone(): SectionTone {
  const pathname = usePathname();

  const subscribeFn = useCallback((onStoreChange: () => void) => subscribe(pathname, onStoreChange), [pathname]);
  const getSnapshotFn = useCallback(() => getSnapshot(pathname).tone, [pathname]);

  return useSyncExternalStore(subscribeFn, getSnapshotFn, getServerTone);
}

/**
 * Current story progress, 0–1, read without subscribing.
 *
 * For frame loops: `<ScrollPhysics>` polls this once per frame and springs
 * toward it. The observer is already running because `SceneRoot` above it calls
 * `useSceneTone`.
 */
export function getSceneProgress(): number {
  return store.progress;
}

/**
 * `progress`, re-centred on one section: ~0 at that section's own eyeline,
 * ~-1 at the previous section's, ~+1 at the next's. Lets `<ScrollVeil>`
 * derive a per-section fade from the exact number the scene already
 * computes, instead of measuring its own scroll transit (S14.1).
 */
export function getLocalSectionProgress(sectionId: string): number {
  const index = sectionIds.indexOf(sectionId);
  if (index < 0 || store.count < 2) return 0;
  return store.progress * (store.count - 1) - index;
}

/**
 * Notification that `progress` moved, delivered outside React.
 *
 * Only the reduced-motion path needs it: there the canvas runs on
 * `frameloop="demand"` and has no frame in which to poll, so scroll has to wake
 * the renderer itself. Adds no listener to the DOM — it hangs off the one
 * `scroll` handler this module already owns.
 */
export function subscribeSceneProgress(onProgressChange: () => void): () => void {
  progressListeners.add(onProgressChange);
  return () => {
    progressListeners.delete(onProgressChange);
  };
}
