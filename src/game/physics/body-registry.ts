import type { RapierRigidBody } from "@react-three/rapier";

import type { EntityId, Vec3 } from "../types/game";

/**
 * The bridge between data-driven entities and the physics world.
 *
 * Rapier bodies are created by `<RigidBody>` components when React mounts a
 * mesh, but systems think in entity ids. This registry is the meeting point:
 * meshes register their bodies on mount, systems look bodies up by id, and a
 * "seed" channel lets systems hand a new body its initial velocity the moment
 * it exists (a merge result inherits momentum its entity was born with).
 *
 * Module-scoped maps are fine: the world is a single instance, and every
 * registration is paired with an unregistration from the same effect.
 */

const bodies = new Map<EntityId, RapierRigidBody>();

/** Initial velocity waiting for a body that hasn't mounted yet. */
const seeds = new Map<EntityId, Vec3>();

/** Hands a starting velocity to the body registered under `id` next. */
export function setBodySeed(id: EntityId, velocity: Vec3): void {
  seeds.set(id, velocity);
}

export function registerBody(id: EntityId, body: RapierRigidBody): void {
  bodies.set(id, body);
  const seed = seeds.get(id);
  if (seed) {
    seeds.delete(id);
    body.setLinvel({ x: seed[0], y: seed[1], z: seed[2] }, true);
  }
}

export function unregisterBody(id: EntityId): void {
  bodies.delete(id);
  seeds.delete(id);
}

export function getBody(id: EntityId): RapierRigidBody | undefined {
  return bodies.get(id);
}

export function bodyEntries(): ReadonlyMap<EntityId, RapierRigidBody> {
  return bodies;
}

/** Drops everything — called when the world unmounts. */
export function clearBodies(): void {
  bodies.clear();
  seeds.clear();
}
