import { FUSION } from "./game-config";
import { describeParts, isFusedKind, partsOf } from "./fusion";

import type { BaseShapeKind, FusedShapeKind, ShapeFamily, ShapeKind } from "../types/game";

/**
 * The species book of the world.
 *
 * Everything a system needs to know about a shape — physics, gameplay and
 * scoring — is a table row. Adding an authored species is adding a row; no
 * system changes (Open/Closed).
 *
 * Composite species aren't in the table at all: when two shapes overlap they
 * fuse into a kind that describes its own recipe (`config/fusion.ts`), and
 * `definitionFor` derives that kind's row from the rows of its ingredients the
 * first time anything asks. So the table stays hand-sized while the set of
 * species the world can contain is open-ended.
 */
export interface ShapeDefinition {
  kind: ShapeKind;
  family: ShapeFamily;
  /** How many fusions deep: 0 for an authored species, else parts − 1. */
  tier: number;
  label: string;
  /** Collision ball radius and geometry base scale, in world units. */
  radius: number;
  mass: number;
  /** Pokes (taps) the shape survives before `SplitSystem` claims it. */
  durability: number;
  /** Points paid out when collected. A merge pays the result's value instead. */
  value: number;
  restitution: number;
  friction: number;
  /** `false` for shapes that refuse to fuse — a composite at `FUSION.maxParts`. */
  mergeable: boolean;
}

export const SHAPE_DEFINITIONS: Record<BaseShapeKind, ShapeDefinition> = {
  cube: {
    kind: "cube",
    family: "matter",
    tier: 0,
    label: "Cube",
    radius: 0.42,
    mass: 1,
    durability: 3,
    value: 5,
    restitution: 0.45,
    friction: 0.6,
    mergeable: true,
  },
  crystal: {
    kind: "crystal",
    family: "crystal",
    tier: 0,
    label: "Crystal",
    radius: 0.4,
    mass: 0.8,
    durability: 2,
    value: 8,
    restitution: 0.35,
    friction: 0.4,
    mergeable: true,
  },
  stone: {
    kind: "stone",
    family: "matter",
    tier: 1,
    label: "Magic stone",
    radius: 0.5,
    mass: 1.6,
    durability: 4,
    value: 12,
    restitution: 0.3,
    friction: 0.8,
    mergeable: true,
  },
  star: {
    kind: "star",
    family: "crystal",
    tier: 1,
    label: "Star",
    radius: 0.46,
    mass: 0.9,
    durability: 3,
    value: 18,
    restitution: 0.5,
    friction: 0.35,
    mergeable: true,
  },
  lantern: {
    kind: "lantern",
    family: "matter",
    tier: 2,
    label: "Lantern",
    radius: 0.55,
    mass: 1.4,
    durability: 5,
    value: 30,
    restitution: 0.25,
    friction: 0.7,
    mergeable: true,
  },
  core: {
    kind: "core",
    family: "matter",
    tier: 3,
    label: "Prism core",
    radius: 0.62,
    mass: 2,
    durability: 6,
    value: 60,
    restitution: 0.2,
    friction: 0.9,
    mergeable: true,
  },
};

/**
 * The kinds the spawn system may place.
 *
 * Only the three light species spawn, and fusion grows everything else from
 * them. `star`, `lantern` and `core` stay authored but unspawned: they were
 * the upper rungs of the old merge ladder, and now that overlapping shapes
 * combine into composites instead of climbing a table, nothing produces them.
 * Adding a kind here is all it takes to put one back in circulation — mind
 * that their `value` is 18/30/60 against the pool's 5/8/12, so handing them
 * out directly moves the scoring curve.
 */
export const SPAWNABLE_KINDS: readonly BaseShapeKind[] = ["cube", "crystal", "stone"];

/** Definitions derived for composite kinds, memoised by recipe. */
const fusedDefinitions = new Map<FusedShapeKind, ShapeDefinition>();

export function definitionFor(kind: ShapeKind): ShapeDefinition {
  if (!isFusedKind(kind)) return SHAPE_DEFINITIONS[kind];

  let definition = fusedDefinitions.get(kind);
  if (!definition) {
    definition = composeFusedDefinition(kind);
    fusedDefinitions.set(kind, definition);
  }
  return definition;
}

/**
 * Derives a composite's row by combining its ingredients' rows.
 *
 * Size is the one value that must not be averaged: two shapes that fuse have
 * to *look* like both of them together, so volumes add and the radius is the
 * cube root of the sum. (A ball of radius `r` has volume `∝ r³`, so
 * `r = ∛(Σ rᵢ³)` is exactly the sphere holding everything that went in — two
 * cubes make a shape ~26% wider, not twice as wide, which is what "combining
 * their areas" actually looks like.)
 *
 * Mass, durability and value add for the same reason. The surface properties
 * (`restitution`, `friction`) are the only averaged fields, weighted by volume
 * share — a big stone fused with a small crystal should still bounce mostly
 * like stone.
 */
function composeFusedDefinition(kind: FusedShapeKind): ShapeDefinition {
  const parts = partsOf(kind)
    .map((part) => SHAPE_DEFINITIONS[part] as ShapeDefinition | undefined)
    .filter((part): part is ShapeDefinition => part !== undefined);

  // A malformed kind string (hand-edited save, stale hot reload) resolves to
  // the base species rather than crashing the frame loop.
  if (parts.length === 0) return SHAPE_DEFINITIONS.cube;
  if (parts.length === 1) return parts[0] as ShapeDefinition;

  let volume = 0;
  let mass = 0;
  let durability = 0;
  let value = 0;
  let restitution = 0;
  let friction = 0;

  for (const part of parts) {
    const share = part.radius ** 3;
    volume += share;
    mass += part.mass;
    durability += part.durability;
    value += part.value;
    restitution += part.restitution * share;
    friction += part.friction * share;
  }

  const dominant = parts.reduce((largest, part) => (part.radius > largest.radius ? part : largest), parts[0] as ShapeDefinition);

  return {
    kind,
    family: dominant.family,
    tier: parts.length - 1,
    label: describeParts(partsOf(kind), (part) => SHAPE_DEFINITIONS[part]?.label ?? part),
    radius: Math.cbrt(volume),
    mass,
    durability: Math.min(durability, FUSION.maxDurability),
    value: Math.round(value * FUSION.valueBonus),
    restitution: restitution / volume,
    friction: friction / volume,
    mergeable: parts.length < FUSION.maxParts,
  };
}
