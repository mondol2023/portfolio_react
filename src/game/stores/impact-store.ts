import { create } from "zustand";

import { IMPACT_RINGS } from "../config/game-config";

import type { EntityId, Vec3 } from "../types/game";

/** The three gameplay moments that punctuate with a shockwave ring. */
export type ImpactKind = "merge" | "split" | "collect";

export interface ImpactRingEntity {
  id: EntityId;
  kind: ImpactKind;
  position: Vec3;
  bornAt: number;
}

/**
 * Transient shockwave rings, one per merge/split/collect. Its own store for
 * the same reason `fragment-store.ts` is: this churns every scoring event
 * while the shape inventory doesn't, so the two never force each other to
 * re-render.
 *
 * Capped at `IMPACT_RINGS.pool` — a burst of simultaneous events (a combo
 * chain) recycles the oldest ring rather than growing unbounded.
 */
interface ImpactStoreState {
  rings: ReadonlyMap<EntityId, ImpactRingEntity>;
  add(init: { kind: ImpactKind; position: Vec3; bornAt: number }): ImpactRingEntity;
  remove(id: EntityId): void;
  clear(): void;
}

export const useImpactStore = create<ImpactStoreState>()((set, get) => ({
  rings: new Map(),

  add(init) {
    const ring: ImpactRingEntity = {
      id: nextImpactId(),
      kind: init.kind,
      position: init.position,
      bornAt: init.bornAt,
    };

    const next = new Map(get().rings);
    next.set(ring.id, ring);

    if (next.size > IMPACT_RINGS.pool) {
      const oldest = [...next.values()].sort((a, b) => a.bornAt - b.bornAt)[0];
      if (oldest) next.delete(oldest.id);
    }

    set({ rings: next });
    return ring;
  },

  remove(id) {
    if (!get().rings.has(id)) return;
    const next = new Map(get().rings);
    next.delete(id);
    set({ rings: next });
  },

  clear() {
    set({ rings: new Map() });
  },
}));

let impactCounter = 0;

function nextImpactId(): EntityId {
  impactCounter += 1;
  return `impact-${impactCounter.toString(36)}`;
}
