/**
 * Phase K of `SCENERY_SYSTEM_PLAN.md`: the crossfade.
 *
 * Everything a scenery touches — exposure, palette, light rig, materials,
 * geometry vocabulary, section variants, the `data-scenery` attribute — was,
 * until this file, swapped the instant `scene-scenery-store.ts` changed
 * `id`: a cut, not a crossfade. §9's fix is "a 900ms multi-track transition
 * (exposure → palette → light intensity → geometry swap, each with its own
 * offset)", which is exactly what a GSAP timeline is for, so that ordering is
 * literal below: four `.call()`s at four offsets, each committing one slice
 * of the target `SceneryDefinition` into the store.
 *
 * None of the four commits are hidden by blending — colour and intensity
 * still snap, same as before. What changes is *when*: every commit lands
 * while a shared opacity dip (`veilTargets`, an explicit registry mirroring
 * `scene-raycaster.ts`'s S7 pattern) has the canvas and the ambient backdrop
 * down near-invisible, so the pop reads as nothing — "crossfade, never cut"
 * without inventing continuous colour/light interpolation this codebase has
 * nowhere else.
 */

import gsap from "gsap";

import { getSceneryDefinition, type SceneryDefinition, type SceneryId } from "./scenery";

const DURATION = 0.9; // seconds — §12's switch budget, exactly.
const VEIL_FLOOR = 0.08;

const veilTargets = new Set<HTMLElement>();

/**
 * Registers an element as part of "the world" the crossfade dips — the
 * canvas wrapper (`scene-root.tsx`) and the ambient backdrop
 * (`ambient-background.tsx`), per S13's "the ambient layer is the visible
 * half". Neither component subscribes to the scenery store to do this; it's
 * a plain ref registration, same non-reactive contract `registerInteractive`
 * already keeps for the raycaster.
 */
export function registerVeilTarget(element: HTMLElement): () => void {
  veilTargets.add(element);
  return () => veilTargets.delete(element);
}

export interface SceneryCrossfadeCommits {
  /** Tone-mapping curve + exposure — §9's first track. */
  exposure(target: SceneryDefinition): void;
  /** The palette skin override — §9's second track. */
  palette(target: SceneryDefinition): void;
  /** Light rig intensities, key orbit, spot — §9's third track. */
  lights(target: SceneryDefinition): void;
  /** Materials, geometry vocabulary, section variants, id — the heaviest
   *  track, committed last and under the deepest part of the dip. */
  geometry(target: SceneryDefinition): void;
}

let activeTimeline: gsap.core.Timeline | null = null;

/**
 * The scenery the in-flight timeline is heading for. `renderScenery.id` still
 * reads as the *old* world until the geometry commit at 44%, so it cannot
 * answer "where are we going" — and a guard that asks it instead lets a
 * second pick either abandon a timeline that then commits anyway, or restart
 * one that was already going to the requested scenery.
 */
let pendingId: SceneryId | null = null;

/**
 * Drops any in-flight crossfade and lifts the veil. For the paths that swap
 * scenery outside a user gesture (`setSceneryInstant`) — without it a killed
 * timeline never runs its `onComplete`, leaving the whole site at 8% opacity.
 */
export function cancelSceneryCrossfade(): void {
  activeTimeline?.kill();
  activeTimeline = null;
  pendingId = null;
  gsap.set(Array.from(veilTargets), { clearProps: "opacity" });
}

/**
 * Runs the crossfade from `fromId` to `toId`. Reduced motion (§11) skips the
 * dip and the stagger entirely and commits all four tracks on the same
 * frame — "the scenery crossfade becomes a one-frame swap", not a broken
 * animation played anyway.
 */
export function runSceneryCrossfade(
  fromId: SceneryId,
  toId: SceneryId,
  reducedMotion: boolean,
  commits: SceneryCrossfadeCommits,
): void {
  // Where the screen is actually headed — the in-flight target if there is
  // one, otherwise what it already shows.
  if ((pendingId ?? fromId) === toId) return;

  const to = getSceneryDefinition(toId);

  activeTimeline?.kill();
  activeTimeline = null;
  pendingId = toId;

  if (reducedMotion) {
    commits.exposure(to);
    commits.palette(to);
    commits.lights(to);
    commits.geometry(to);
    pendingId = null;
    gsap.set(Array.from(veilTargets), { clearProps: "opacity" });
    return;
  }

  const elements = Array.from(veilTargets);
  const timeline = gsap.timeline({
    onComplete: () => {
      gsap.set(elements, { clearProps: "opacity" });
      activeTimeline = null;
      pendingId = null;
    },
  });
  activeTimeline = timeline;

  // Phase L Part 7 retime. Same four tracks in the same order; what moved is
  // the gap after `geometry`. It used to be 36ms, so the heaviest commit —
  // variant remount, fresh geometry and materials — landed barely one frame
  // before the reveal and the new world's mount hitch was the first thing
  // the veil uncovered. It now commits at 44% and is hidden until 60%. The
  // dip eases in and out too, rather than snapping away under `power2.out`:
  // a dissolve, not a blink.
  timeline
    .to(elements, { opacity: VEIL_FLOOR, duration: DURATION * 0.18, ease: "power2.inOut" }, 0)
    .call(() => commits.exposure(to), [], DURATION * 0.2)
    .call(() => commits.palette(to), [], DURATION * 0.28)
    .call(() => commits.lights(to), [], DURATION * 0.36)
    // A scheduled offset alone does not survive a dropped frame: one tick
    // spanning 0.44→0.60 fires the commit and renders the reveal together,
    // and measured across the twelve pairs that is not rare — under a
    // software rasterizer it happened on 7 of 12, twice at full opacity.
    // Pausing here costs the timeline nothing when frames are healthy and
    // guarantees the new world gets a whole frame behind the veil when they
    // are not.
    .addPause(DURATION * 0.44, () => {
      commits.geometry(to);
      requestAnimationFrame(() => {
        if (activeTimeline === timeline) timeline.play();
      });
    })
    .to(elements, { opacity: 1, duration: DURATION * 0.4, ease: "power2.inOut" }, DURATION * 0.6);
}
