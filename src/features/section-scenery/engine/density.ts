/**
 * The workload tier a scene is built at.
 *
 * Set once per viewport/device (see `../use-density.ts`) and threaded into
 * each scene factory in `scenes/*.ts`, which uses `scaleCount` on its
 * primitives' element counts — never on speed, radius, or any other
 * parameter that would change what a scene actually *is*. A lower tier is
 * the same idea, quieter, per the README's "same silhouette" rule.
 *
 * `full` is today's numbers, unchanged. The other three only ever appear on
 * a narrower viewport or a device the low-power check disqualifies.
 */
export type SceneDensity = "full" | "moderate" | "sparse" | "minimal";

/** Fraction of a primitive's base count that survives at each tier. */
const COUNT_SCALE: Record<SceneDensity, number> = {
  full: 1,
  moderate: 0.75,
  sparse: 0.5,
  minimal: 0.35,
};

/** Scales an element count for the given tier. Never below 1 — a scene should
 *  thin out, not disappear. */
export function scaleCount(base: number, density: SceneDensity): number {
  return Math.max(1, Math.round(base * COUNT_SCALE[density]));
}

/**
 * The loop's starting resolution budget (`engine/loop.ts`'s `quality`).
 *
 * Frame-cost adaptation still runs on top of this and, per its own rule,
 * only ever falls further — this just picks a lower starting point so a
 * mobile or low-power visitor isn't rendered at full resolution for the
 * ~90 frames the cost sampler needs to notice and step down on its own.
 */
const QUALITY_FLOOR: Record<SceneDensity, number> = {
  full: 1,
  moderate: 0.85,
  sparse: 0.75,
  minimal: 0.5,
};

export function initialQuality(density: SceneDensity): number {
  return QUALITY_FLOOR[density];
}
