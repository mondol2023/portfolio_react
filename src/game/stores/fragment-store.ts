import { create } from "zustand";

import type { EntityId, FragmentEntity, ShapeKind, Vec3 } from "../types/game";

/**
 * Transient debris produced by the split system.
 *
 * Deliberately its own store rather than a slice of the shape store: fragments
 * churn constantly (spawn, shrink, vanish) while the shape inventory moves
 * rarely, and keeping them apart means poking a shape never re-renders the
 * fragment field and vice versa.
 */
interface FragmentStoreState {
  fragments: ReadonlyMap<EntityId, FragmentEntity>;
  add(init: { kind: ShapeKind; scale: number; position: Vec3; velocity: Vec3; bornAt: number; lifetimeMs: number }): FragmentEntity;
  remove(id: EntityId): void;
  clear(): void;
}

export const useFragmentStore = create<FragmentStoreState>()((set, get) => ({
  fragments: new Map(),

  add(init) {
    const fragment: FragmentEntity = {
      id: nextFragmentId(),
      kind: init.kind,
      scale: init.scale,
      position: init.position,
      velocity: init.velocity,
      bornAt: init.bornAt,
      lifetimeMs: init.lifetimeMs,
    };

    const next = new Map(get().fragments);
    next.set(fragment.id, fragment);
    set({ fragments: next });
    return fragment;
  },

  remove(id) {
    if (!get().fragments.has(id)) return;
    const next = new Map(get().fragments);
    next.delete(id);
    set({ fragments: next });
  },

  clear() {
    set({ fragments: new Map() });
  },
}));

let fragmentCounter = 0;

function nextFragmentId(): EntityId {
  fragmentCounter += 1;
  return `frag-${fragmentCounter.toString(36)}`;
}
