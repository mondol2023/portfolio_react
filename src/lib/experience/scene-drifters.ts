/**
 * Where the drifting objects live and how they travel. Plan §11, Phase 20.
 *
 * Lane, depth, size and form are authored ladders so the first three — all a
 * `low` tier mounts — already compose; only timing is seeded. Spatial values
 * are viewport fractions, never world units, and nothing imports `three`.
 */

import type { Tier } from "./device-tier";
import { seededRandom } from "./random";

/** Five deliberate forms. Not cubes and not orbs — §2's forbidden list names both. */
export type DrifterForm = "ring" | "shard" | "slab" | "rod" | "prism";

export interface DrifterSpec {
  form: DrifterForm;
  /** Distance in front of the camera, in world units. Ahead of the focal mass, behind nothing. */
  depth: number;
  /** Radius as a fraction of the viewport half-height at its own depth. */
  sizeFrac: number;
  /** Lane height, as a fraction of the viewport half-height. Signed. */
  laneY: number;
  /** How far each way the lane runs, as a fraction of the viewport half-width. */
  spanX: number;
  /** Seconds for one complete there-and-back. */
  period: number;
  /** Where in that cycle it starts, 0–1. */
  phase: number;
  bobFrac: number;
  bobPeriod: number;
  /** Constant ambient rotation, rad/s per axis. Zero on two of every five. */
  spin: { x: number; y: number; z: number };
  /** Mount attitude, radians. Also the reduced-motion pose — spin accumulates from here. */
  rest: { x: number; y: number; z: number };
  metal: boolean;
}

/**
 * Each is its own draw call — the forms differ, so there is nothing to
 * instance. Eight against §8's ≤60 ceiling is the whole cost of the feature.
 */
export const DRIFTER_COUNT: Record<Tier, number> = { low: 3, mid: 5, high: 8 };

const FORMS: readonly DrifterForm[] = ["ring", "shard", "slab", "rod", "prism"];

/** Alternating sides, and never inside ±0.30 — the eyeline stays the reader's. */
const LANES = [0.6, -0.52, 0.88, -0.8, 0.34, -0.36, 0.95, -0.68] as const;
const DEPTHS = [3.1, 4.2, 2.6, 5, 3.6, 4.7, 2.9, 5.4] as const;
const SIZE_FRACS = [0.085, 0.062, 0.105, 0.05, 0.072, 0.058, 0.095, 0.046] as const;

/**
 * Spans over 1 are deliberate: those drifters leave the frame at each end of
 * their run and come back, which is what stops eight objects reading as a row.
 */
const SPANS = [1.12, 0.86, 0.74, 1.2, 0.95, 1.05, 0.8, 1.16] as const;

export function buildDrifters(count: number): DrifterSpec[] {
  const random = seededRandom(23);

  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    // Long and coprime-ish: two lanes that share a period would beat against
    // each other for the whole session.
    const period = 38 + random() * 52;
    const spins = random() * 0.16 - 0.08;
    // Two of every five hold still and only travel, so the frame is never
    // "everything rotating at once".
    const still = index % 5 === 1 || index % 5 === 3;
    // Authored before the ladders below so every drifter reads as *placed*
    // rather than axis-aligned — the pose reduced motion keeps, and the one
    // the first frame of a normal load starts from.
    const rest = { x: random() * Math.PI, y: random() * Math.PI * 2, z: random() * Math.PI };

    return {
      form: FORMS[index % FORMS.length] ?? "shard",
      depth: DEPTHS[index % DEPTHS.length] ?? 3.5,
      sizeFrac: SIZE_FRACS[index % SIZE_FRACS.length] ?? 0.07,
      laneY: LANES[index % LANES.length] ?? 0.5,
      spanX: SPANS[index % SPANS.length] ?? 1,
      period,
      phase: random(),
      bobFrac: 0.04 + random() * 0.07,
      bobPeriod: 11 + random() * 12,
      spin: still
        ? { x: 0, y: 0, z: 0 }
        : { x: spins * 0.6, y: spins, z: spins * 0.35 },
      rest,
      metal: index % 3 === 2,
    };
  });
}
