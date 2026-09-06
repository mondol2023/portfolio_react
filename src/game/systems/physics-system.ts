import { CONTAINMENT, WORLD_BOUNDS } from "../config/game-config";
import { bodyEntries, unregisterBody } from "../physics/body-registry";
import { useInteractionStore } from "../stores/interaction-store";
import { useShapeStore } from "../stores/shape-store";

import type { GameSystem, SystemContext } from "./types";

/**
 * Keeps the floating world floating.
 *
 * The world is zero-g with no floor; this system is the invisible container.
 * Every free body is softly pulled toward the spot it was first seen at and
 * damped, so shapes bob gently behind the content instead of drifting away.
 * Dragged bodies are exempt — the interaction system owns their velocity —
 * and anything somehow outside the kill volume is recycled (the spawn system
 * refills the gap).
 */
export class PhysicsSystem implements GameSystem {
  readonly id = "physics";

  /** Home position per body, captured the first time the body is seen. */
  private readonly homes = new Map<string, [number, number, number]>();

  update({ delta }: SystemContext): void {
    const draggedId = useInteractionStore.getState().draggingId;
    const smoothing = 1 - Math.exp(-CONTAINMENT.velocityDamping * delta);
    const angularSmoothing = 1 - Math.exp(-CONTAINMENT.angularDamping * delta);

    for (const [id, body] of bodyEntries()) {
      const translation = body.translation();
      const position: [number, number, number] = [translation.x, translation.y, translation.z];

      if (position[1] < WORLD_BOUNDS.killY) {
        // Out of the world entirely: recycle the entity; the mesh's own
        // unmount effect unregisters the body from the registry.
        useShapeStore.getState().remove(id);
        this.homes.delete(id);
        unregisterBody(id);
        continue;
      }

      if (id === draggedId) continue;

      let home = this.homes.get(id);
      if (!home) {
        home = position;
        this.homes.set(id, home);
      }

      const velocity = body.linvel();
      const desiredX = (home[0] - position[0]) * CONTAINMENT.homeStiffness;
      const desiredY = (home[1] - position[1]) * CONTAINMENT.homeStiffness;
      const desiredZ = (home[2] - position[2]) * CONTAINMENT.homeStiffness;

      let vx = velocity.x + (desiredX - velocity.x) * smoothing;
      let vy = velocity.y + (desiredY - velocity.y) * smoothing;
      let vz = velocity.z + (desiredZ - velocity.z) * smoothing;

      const speed = Math.hypot(vx, vy, vz);
      if (speed > CONTAINMENT.maxSpeed) {
        const scale = CONTAINMENT.maxSpeed / speed;
        vx *= scale;
        vy *= scale;
        vz *= scale;
      }

      body.setLinvel({ x: vx, y: vy, z: vz }, false);

      const angular = body.angvel();
      if (angular.x || angular.y || angular.z) {
        body.setAngvel(
          {
            x: angular.x * (1 - angularSmoothing),
            y: angular.y * (1 - angularSmoothing),
            z: angular.z * (1 - angularSmoothing),
          },
          false,
        );
      }
    }

    // Prune homes for bodies that no longer exist (removed elsewhere).
    for (const id of this.homes.keys()) {
      if (!bodyEntries().has(id)) this.homes.delete(id);
    }
  }
}
