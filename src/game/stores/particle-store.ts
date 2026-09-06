import { create } from "zustand";

import type { Vec3 } from "../types/game";

/**
 * The hand-off queue between "something worth a burst happened" and the
 * canvas-side particle system that drains it.
 *
 * Producers (merge/split/collect paths, UI buttons) only ever enqueue — they
 * have no idea a particle system exists, let alone that it lives inside a
 * WebGL context. The consumer drains once per frame and never triggers a
 * React render: `queue` changes are read imperatively via `getState()`.
 */
export type BurstKind = "merge" | "split" | "collect" | "spawn";

export interface BurstRequest {
  kind: BurstKind;
  /** World-space origin of the burst. */
  position: Vec3;
  /** 0..1 strength scaling count and speed against the configured budget. */
  strength: number;
}

interface ParticleStoreState {
  queue: readonly BurstRequest[];
  /** Live particle count, maintained by the particle system for budgeting. */
  activeCount: number;
  enqueue(request: BurstRequest): void;
  /** Empties and returns the pending queue; called once per frame by the consumer. */
  drain(): readonly BurstRequest[];
  setActiveCount(count: number): void;
  clear(): void;
}

export const useParticleStore = create<ParticleStoreState>()((set, get) => ({
  queue: [],
  activeCount: 0,

  enqueue(request) {
    set((state) => ({ queue: [...state.queue, request] }));
  },

  drain() {
    const { queue } = get();
    if (queue.length === 0) return [];
    set({ queue: [] });
    return queue;
  },

  setActiveCount(count) {
    set((state) => (state.activeCount === count ? state : { activeCount: count }));
  },

  clear() {
    set({ queue: [], activeCount: 0 });
  },
}));
