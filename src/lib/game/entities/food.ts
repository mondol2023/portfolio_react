import * as THREE from "three";

import { GAME_COLORS, GAME_CONFIG } from "../config";

/**
 * The single edible sphere on the field.
 *
 * Owns nothing about the snake — it only needs to be told which world
 * positions are currently occupied so it can avoid spawning inside them.
 * That keeps food spawning and snake movement independently testable.
 */
export class Food {
  private readonly mesh: THREE.Mesh;

  constructor(private readonly scene: THREE.Scene) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(GAME_CONFIG.foodRadius, 16, 16),
      new THREE.MeshStandardMaterial({ color: GAME_COLORS.food, emissive: GAME_COLORS.food, emissiveIntensity: 0.3 }),
    );
    this.mesh.position.y = GAME_CONFIG.foodRadius;
    this.scene.add(this.mesh);
  }

  getPosition(): THREE.Vector3 {
    return this.mesh.position;
  }

  /** Moves the food to a random spot clear of `occupied`. Falls back to the last try if the field is too crowded. */
  spawn(occupied: readonly THREE.Vector3[]): void {
    const half = GAME_CONFIG.arenaSize / 2;
    // Inset from the boundary so food never sits exactly on the wrap seam.
    const inset = half * 0.9;

    let candidate = this.randomPoint(inset);
    for (let attempt = 0; attempt < GAME_CONFIG.foodSpawnAttempts; attempt++) {
      candidate = this.randomPoint(inset);
      if (this.isClear(candidate, occupied)) break;
    }

    this.mesh.position.set(candidate.x, GAME_CONFIG.foodRadius, candidate.z);
  }

  private randomPoint(inset: number): { x: number; z: number } {
    return {
      x: (Math.random() * 2 - 1) * inset,
      z: (Math.random() * 2 - 1) * inset,
    };
  }

  private isClear(point: { x: number; z: number }, occupied: readonly THREE.Vector3[]): boolean {
    const clearanceSq = GAME_CONFIG.foodSpawnClearance ** 2;
    return occupied.every((position) => {
      const dx = position.x - point.x;
      const dz = position.z - point.z;
      return dx * dx + dz * dz > clearanceSq;
    });
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
