/**
 * Domain types for the interactive world layer.
 *
 * `src/game` is a portable, self-contained module: everything in here is plain
 * data — no React, no three.js, no Rapier — so the folder can be lifted out of
 * the portfolio without dragging host code along. Renderer-specific types live
 * next to the code that owns them (e.g. `systems/types.ts`, Phase 3).
 */

/** Identifies one living object in the world. A plain string keeps stores simple. */
export type EntityId = string;

/**
 * The hand-authored species. Each maps to a row in `config/shape-registry.ts`.
 */
export type BaseShapeKind = "cube" | "crystal" | "stone" | "star" | "lantern" | "core";

/**
 * A composite species, born when two shapes overlap and fuse.
 *
 * The kind string *is* the recipe: `fused:` followed by the sorted base kinds
 * that went into it, joined by `+` (e.g. `fused:crystal+cube`). Making the id
 * self-describing means a fused shape needs no side table to be understood —
 * its definition, geometry and material are all derived back out of the
 * string, and two shapes that fused from the same ingredients in a different
 * order are literally the same kind. See `config/fusion.ts`.
 */
export type FusedShapeKind = `fused:${string}`;

/**
 * Any species a live shape may be: an authored one, or a fusion of several.
 *
 * Note this is no longer a closed union, so a `switch` over it can't be
 * exhaustive — resolve a kind through `definitionFor`, `getShapeGeometry` and
 * `getShapeMaterial`, which all understand both halves.
 */
export type ShapeKind = BaseShapeKind | FusedShapeKind;

/** Broad material families; a fusion inherits the family of its largest part. */
export type ShapeFamily = "matter" | "crystal";

/** Lifecycle of an interactive shape. */
export type ShapeState = "idle" | "dragged" | "merging" | "splitting" | "despawning";

/**
 * A living, physics-driven object the visitor can poke, drag, throw, merge,
 * split or collect. Pure data — the physics body it belongs to is resolved by
 * the systems that own the physics world, never stored here.
 */
export interface ShapeEntity {
  id: EntityId;
  kind: ShapeKind;
  family: ShapeFamily;
  /** How many fusions deep the shape is: 0 for an authored species, else parts − 1. */
  tier: number;
  state: ShapeState;
  /** Remaining pokes before `SplitSystem` claims the shape. */
  health: number;
  /** Pokes the shape started with (so fragments can scale off the ratio). */
  durability: number;
  clickCount: number;
  /** `performance.now()` timestamp, used for cooldowns and spawn grace. */
  bornAt: number;
  /** Until this timestamp the shape refuses to merge (spawn/split grace). */
  mergeLockUntil: number;
  /** Points paid out when the shape is collected; a merge pays the result's value. */
  value: number;
  /**
   * Initial spawn position — the mount pose for the mesh and its body. Never
   * updated afterwards: the live transform belongs to the physics body, which
   * the render loop reads directly, so this field staying frozen costs nothing.
   */
  position: Vec3;
}

/** A short-lived chunk produced by the split system; inherits velocity, fades out. */
export interface FragmentEntity {
  id: EntityId;
  kind: ShapeKind;
  scale: number;
  /** Spawn pose; the split system integrates the live transform itself. */
  position: Vec3;
  /** Inherited parent velocity plus a radial impulse, in m/s. */
  velocity: Vec3;
  bornAt: number;
  /** Total lifetime in ms; the fragment shrinks throughout and is removed at the end. */
  lifetimeMs: number;
}

/** Plain 3D vector tuple — portable by design, no three.js dependency. */
export type Vec3 = readonly [number, number, number];

export type DespawnReason = "merged" | "split" | "collected" | "recycled" | "fell";

export type AudioCue =
  | "spawn"
  | "poke"
  | "throw"
  | "merge"
  | "split"
  | "collect"
  | "toggle-on"
  | "toggle-off";

/**
 * Everything the world can announce to the outside. Systems emit; the score,
 * audio and particle systems consume internally, and the host app may listen
 * through `GameProvider`'s `onEvent` — its single hook-in point.
 */
export type GameEvent =
  | { type: "world"; phase: "ready" | "paused" | "resumed" | "error"; message?: string }
  | { type: "spawn"; entityId: EntityId; kind: ShapeKind }
  | { type: "despawn"; entityId: EntityId; reason: DespawnReason }
  | { type: "poke"; entityId: EntityId; kind: ShapeKind; healthLeft: number }
  | { type: "throw"; entityId: EntityId; speed: number }
  | { type: "merge"; resultId: EntityId; sources: [EntityId, EntityId]; kind: ShapeKind; position: Vec3 }
  | { type: "split"; sourceId: EntityId; fragmentIds: EntityId[]; kind: ShapeKind; position: Vec3 }
  | { type: "collect"; entityId: EntityId; kind: ShapeKind; points: number; position: Vec3 }
  | { type: "score"; total: number; delta: number }
  | { type: "audio"; cue: AudioCue; position?: Vec3 };

/** Hardware-flavoured scaling knobs, mirroring the host site's tier philosophy. */
export interface GameBudget {
  /** Upper bound for the render loop's device pixel ratio. */
  maxDpr: number;
  /** Decorative instanced background objects (stars, birds, far lanterns). */
  ambientCount: number;
  /** Population of interactive shapes the spawn system maintains. */
  interactiveCount: number;
  /** Particles per burst at full strength. */
  particleBudget: number;
}

export interface GameSettings {
  budget: GameBudget;
  /** Downward gravity in m/s² — softened below Earth's so things drift a little. */
  gravity: number;
}
