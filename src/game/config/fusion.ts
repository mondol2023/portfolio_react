import type { BaseShapeKind, FusedShapeKind, ShapeKind } from "../types/game";

/**
 * Identity of a fused species.
 *
 * When two shapes overlap they don't climb a hand-authored ladder any more —
 * they *combine*: the result carries the geometry and the volume of everything
 * that went into it. That makes the set of possible species open-ended, so
 * instead of a lookup table this module encodes the recipe directly in the
 * kind string:
 *
 * ```
 * cube + crystal            -> "fused:crystal+cube"
 * (cube + crystal) + cube   -> "fused:crystal+cube+cube"
 * ```
 *
 * Two consequences make the rest of the world simple. Parts are **sorted**, so
 * fusing A onto B and B onto A produce the same kind — one cache entry, one
 * geometry, one material. And the string is **self-describing**, so nothing
 * needs to have witnessed the fusion to render or price the result: every
 * registry recovers the ingredients with `partsOf` and derives the rest. A
 * shape surviving a hot reload, or arriving from a saved world, still resolves.
 *
 * This module deliberately imports nothing but types — it sits underneath
 * `shape-registry`, which is what turns a parsed recipe into a definition.
 */

const FUSED_PREFIX = "fused:";
const PART_SEPARATOR = "+";

/** Narrows a kind to a fusion; anything else is an authored species. */
export function isFusedKind(kind: ShapeKind): kind is FusedShapeKind {
  return kind.startsWith(FUSED_PREFIX);
}

/**
 * The canonical kind for a bag of ingredients. Sorting here is what makes the
 * id order-independent, so callers may pass parts in whatever order the merge
 * happened to find them.
 */
export function fusedKindFor(parts: readonly BaseShapeKind[]): FusedShapeKind {
  return `${FUSED_PREFIX}${[...parts].sort().join(PART_SEPARATOR)}`;
}

/**
 * The authored species a kind is made of — its own single self if it isn't a
 * fusion. Always flat: fusing a fusion concatenates leaves rather than
 * nesting, so a shape's part count is exactly the number of shapes that went
 * into it.
 */
export function partsOf(kind: ShapeKind): readonly BaseShapeKind[] {
  if (!isFusedKind(kind)) return [kind];
  return kind.slice(FUSED_PREFIX.length).split(PART_SEPARATOR) as BaseShapeKind[];
}

/** The kind two shapes become when they fuse — the union of their ingredients. */
export function fuseKinds(a: ShapeKind, b: ShapeKind): FusedShapeKind {
  return fusedKindFor([...partsOf(a), ...partsOf(b)]);
}

/**
 * Human-readable name for a recipe, collapsing repeats (`"2x Cube + Crystal"`).
 * Used for the definition's `label`; nothing renders it yet, but a fusion
 * without a name would be the one species you couldn't talk about.
 */
export function describeParts(parts: readonly BaseShapeKind[], labelOf: (part: BaseShapeKind) => string): string {
  const counts = new Map<BaseShapeKind, number>();
  for (const part of parts) counts.set(part, (counts.get(part) ?? 0) + 1);

  return [...counts]
    .map(([part, count]) => (count > 1 ? `${count}x ${labelOf(part)}` : labelOf(part)))
    .join(" + ");
}
