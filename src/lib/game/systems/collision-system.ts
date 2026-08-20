import type * as THREE from "three";

import { GAME_CONFIG } from "../config";

/**
 * Pure sphere-overlap collision checks, deliberately free of any Three.js
 * scene/mesh knowledge — they take positions in, return booleans out, so
 * they're trivial to reason about (and to unit test later) in isolation from
 * rendering.
 */

function isOverlapping(a: THREE.Vector3, b: THREE.Vector3, combinedRadius: number): boolean {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz <= combinedRadius * combinedRadius;
}

/** True if the head overlaps any of its own (collidable) body segments. */
export function checkSelfCollision(headPosition: THREE.Vector3, bodyPositions: readonly THREE.Vector3[]): boolean {
  const combinedRadius = GAME_CONFIG.segmentRadius * 2;
  return bodyPositions.some((segment) => isOverlapping(headPosition, segment, combinedRadius));
}

/** True if the head overlaps the food sphere. */
export function checkFoodCollision(headPosition: THREE.Vector3, foodPosition: THREE.Vector3): boolean {
  const combinedRadius = GAME_CONFIG.segmentRadius + GAME_CONFIG.foodRadius;
  return isOverlapping(headPosition, foodPosition, combinedRadius);
}
