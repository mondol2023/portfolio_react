import { SPAWN_RULES, WORLD_BOUNDS } from "../config/game-config";
import { SPAWNABLE_KINDS } from "../config/shape-registry";
import { setBodySeed } from "../physics/body-registry";
import { useShapeStore } from "../stores/shape-store";
import { useWorldStore } from "../stores/world-store";
import { emitGame } from "../events/game-bus";
import { randRange, seededRandom, type Random } from "../utils/seeded";

import type { GameBudget, GameSystem, SystemContext } from "./types";
import type { ShapeKind, Vec3 } from "../types/game";

/**
 * Population maintenance for the interactive shape field.
 *
 * Fills the world to the budget's `interactiveCount` on mount and replaces
 * anything that leaves (a merge consumed it, it was collected, it fell out of
 * the containment volume), keeping a steady, sparse population rather than
 * floods and gaps. Spawn positions are rejected against a minimum separation
 * so new shapes never appear on top of each other.
 *
 * The fill is idempotent: it tops up to the target rather than blind-spawning,
 * which makes a React StrictMode remount a no-op instead of a duplication.
 */
export class SpawnSystem implements GameSystem {
  readonly id = "spawn";

  private readonly random: Random;
  private readonly target: number;
  private readonly baseKind: ShapeKind;
  private readonly midKind: ShapeKind;
  private readonly highKind: ShapeKind;
  private lastSpawnAt = 0;
  private filled = false;

  constructor(budget: GameBudget) {
    this.target = budget.interactiveCount;
    const [base, mid, high] = SPAWNABLE_KINDS;
    this.baseKind = base ?? "cube";
    this.midKind = mid ?? "crystal";
    this.highKind = high ?? "stone";
    // Session-random, not render-time: systems may construct anywhere; only
    // *placement during render* ever needed determinism for hydration.
    this.random = seededRandom((Date.now() ^ 0x5f3759df) >>> 0);
  }

  update({ now }: SystemContext): void {
    const population = useShapeStore.getState().entities.size;

    if (!this.filled) {
      this.filled = true;
      for (let i = population; i < this.target; i += 1) {
        this.spawnOne(now);
      }
      this.publishCounts();
      return;
    }

    if (population < this.target && now - this.lastSpawnAt >= SPAWN_RULES.respawnDelayMs) {
      this.lastSpawnAt = now;
      this.spawnOne(now);
      this.publishCounts();
    }
  }

  /** Places one shape away from its neighbours and announces the arrival. */
  private spawnOne(now: number): void {
    const kind = this.pickKind();
    const position = this.findPosition();

    const entity = useShapeStore.getState().add({ kind, now, position });
    // A gentle downward drift so arrivals float in rather than pop in.
    setBodySeed(entity.id, [0, SPAWN_RULES.entryImpulse, 0]);
    emitGame({ type: "spawn", entityId: entity.id, kind });
  }

  private pickKind(): ShapeKind {
    // Weighted toward base species so the ladder stays climbable, while rare
    // mid-tier shapes still appear on their own.
    const roll = this.random();
    if (roll < 0.55) return this.baseKind;
    if (roll < 0.85) return this.midKind;
    return this.highKind;
  }

  private findPosition(): Vec3 {
    const entities = useShapeStore.getState().entities;

    for (let attempt = 0; attempt < SPAWN_RULES.maxAttempts; attempt += 1) {
      const candidate: Vec3 = [
        randRange(-WORLD_BOUNDS.x + SPAWN_RULES.marginInside, WORLD_BOUNDS.x - SPAWN_RULES.marginInside, this.random),
        randRange(WORLD_BOUNDS.yBottom + SPAWN_RULES.marginInside, WORLD_BOUNDS.yTop - SPAWN_RULES.marginInside, this.random),
        randRange(-WORLD_BOUNDS.z, WORLD_BOUNDS.z, this.random),
      ];

      let clear = true;
      for (const entity of entities.values()) {
        const dx = entity.position[0] - candidate[0];
        const dy = entity.position[1] - candidate[1];
        const dz = entity.position[2] - candidate[2];
        if (dx * dx + dy * dy + dz * dz < SPAWN_RULES.minSeparation * SPAWN_RULES.minSeparation) {
          clear = false;
          break;
        }
      }
      if (clear) return candidate;
    }

    // Every attempt clashed: accept a fresh random spot rather than stall the
    // population — overlaps resolve themselves under containment.
    return [
      randRange(-WORLD_BOUNDS.x, WORLD_BOUNDS.x, this.random),
      randRange(WORLD_BOUNDS.yBottom, WORLD_BOUNDS.yTop, this.random),
      randRange(-WORLD_BOUNDS.z, WORLD_BOUNDS.z, this.random),
    ];
  }

  private publishCounts(): void {
    const world = useWorldStore.getState();
    world.setCounts(useShapeStore.getState().entities.size, world.ambientCount);
  }
}
