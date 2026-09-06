import { create } from "zustand";

import { MERGE_RULES } from "../config/game-config";
import { definitionFor } from "../config/shape-registry";
import { SPLIT_RULES } from "../config/game-config";

import type { EntityId, ShapeEntity, ShapeKind, ShapeState, Vec3 } from "../types/game";

/**
 * The living inventory of interactive shapes.
 *
 * The store holds *data*, never three.js objects: meshes look their entity up
 * by id and read transforms straight off their Rapier bodies each frame, so a
 * shape flying across the screen costs zero React renders. Mutators are plain
 * functions on the store — systems call `useShapeStore.getState().add(...)`
 * from inside frame loops without a component in sight.
 *
 * The `entities` map is replaced (not mutated) on every change so shallow
 * equality stays meaningful for the few UI subscribers.
 */

let idCounter = 0;

export function nextEntityId(prefix: string): EntityId {
  idCounter += 1;
  return `${prefix}-${idCounter.toString(36)}`;
}

export interface ShapeSpawnInit {
  kind: ShapeKind;
  now: number;
  /** Initial pose; the live transform afterwards belongs to the physics body. */
  position: Vec3;
  /** Optional pre-armed merge lock; defaults to the spawn grace period. */
  mergeLockUntil?: number;
}

interface ShapeStoreState {
  entities: ReadonlyMap<EntityId, ShapeEntity>;
  add(init: ShapeSpawnInit): ShapeEntity;
  patch(id: EntityId, patch: Partial<Omit<ShapeEntity, "id">>): void;
  remove(id: EntityId): void;
  /** Records one tap: increments the click count and applies poke damage. */
  registerPoke(id: EntityId): { entity: ShapeEntity; healthLeft: number } | null;
  setState(id: EntityId, state: ShapeState): void;
  clear(): void;
}

export const useShapeStore = create<ShapeStoreState>()((set, get) => ({
  entities: new Map(),

  add({ kind, now, position, mergeLockUntil }) {
    const definition = definitionFor(kind);
    const entity: ShapeEntity = {
      id: nextEntityId("shape"),
      kind,
      family: definition.family,
      tier: definition.tier,
      state: "idle",
      health: definition.durability,
      durability: definition.durability,
      clickCount: 0,
      bornAt: now,
      mergeLockUntil: mergeLockUntil ?? now + MERGE_RULES.spawnLockMs,
      value: definition.value,
      position,
    };

    const next = new Map(get().entities);
    next.set(entity.id, entity);
    set({ entities: next });
    return entity;
  },

  patch(id, patch) {
    const current = get().entities.get(id);
    if (!current) return;
    const next = new Map(get().entities);
    next.set(id, { ...current, ...patch });
    set({ entities: next });
  },

  remove(id) {
    if (!get().entities.has(id)) return;
    const next = new Map(get().entities);
    next.delete(id);
    set({ entities: next });
  },

  registerPoke(id) {
    const entity = get().entities.get(id);
    if (!entity) return null;

    const healthLeft = Math.max(0, entity.health - SPLIT_RULES.damagePerPoke);
    const updated: ShapeEntity = {
      ...entity,
      health: healthLeft,
      clickCount: entity.clickCount + 1,
    };

    const next = new Map(get().entities);
    next.set(id, updated);
    set({ entities: next });

    return { entity: updated, healthLeft };
  },

  setState(id, state) {
    get().patch(id, { state });
  },

  clear() {
    set({ entities: new Map() });
  },
}));
