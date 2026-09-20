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
  if (fromId === toId) return;

  const to = getSceneryDefinition(toId);

  activeTimeline?.kill();
  activeTimeline = null;

  if (reducedMotion) {
    commits.exposure(to);
    commits.palette(to);
    commits.lights(to);
    commits.geometry(to);
    gsap.set(Array.from(veilTargets), { clearProps: "opacity" });
    return;
  }

  const elements = Array.from(veilTargets);
  const timeline = gsap.timeline({
    onComplete: () => {
      gsap.set(elements, { clearProps: "opacity" });
      activeTimeline = null;
    },
  });
  activeTimeline = timeline;

  timeline
    .to(elements, { opacity: VEIL_FLOOR, duration: DURATION * 0.12, ease: "power2.out" }, 0)
    .call(() => commits.exposure(to), [], DURATION * 0.14)
    .call(() => commits.palette(to), [], DURATION * 0.3)
    .call(() => commits.lights(to), [], DURATION * 0.46)
    .call(() => commits.geometry(to), [], DURATION * 0.6)
    .to(elements, { opacity: 1, duration: DURATION * 0.36, ease: "power2.inOut" }, DURATION * 0.64);
}
