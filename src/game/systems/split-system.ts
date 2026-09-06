import { SPLIT_RULES } from "../config/game-config";
import { definitionFor } from "../config/shape-registry";
import { getBody, unregisterBody } from "../physics/body-registry";
import { getFragmentMesh, unregisterFragmentMesh } from "../render/render-registry";
import { useFragmentStore } from "../stores/fragment-store";
import { useShapeStore } from "../stores/shape-store";
import { emitGame } from "../events/game-bus";

import type { GameSystem, SystemContext } from "./types";
import type { EntityId, Vec3 } from "../types/game";

/**
 * Breaks a shape into short-lived fragments.
 *
 * Triggered by event, not by scan: the interaction system publishes a `poke`
 * (see `publishPoke` below) and a shape at zero health splits here — but not
 * instantly. It's first patched to `"splitting"` and held for
 * `SPLIT_RULES.telegraphMs` (a short crack-before-it-breaks tremble, driven
 * by `AnimationSystem`) before the actual break runs. Each fragment inherits
 * a share of the parent's velocity plus a radial impulse, then follows a
 * simple ballistic arc — visual-only, no physics bodies, so a split costs no
 * Rapier work at all. Fragments shrink over their lifetime (driven by writing
 * mesh scales directly) and vanish at the end of it.
 */
export class SplitSystem implements GameSystem {
  readonly id = "split";

  /** Live fragment motion — mutable tuples, owned here, never in React state. */
  private readonly live = new Map<EntityId, { position: [number, number, number]; velocity: [number, number, number] }>();

  /** Entities telegraphing a split, mapped to the timestamp they actually break. */
  private readonly pendingSplit = new Map<EntityId, number>();

  private readonly unsubscribePoke: () => void;

  constructor() {
    this.unsubscribePoke = subscribePoke(this.handlePoke);
  }

  update({ delta, now }: SystemContext): void {
    this.drainPending(now);

    const fragments = useFragmentStore.getState().fragments;
    if (fragments.size === 0) return;

    const gravity = SPLIT_RULES.fragmentImpulse * -0.55;
    const expired: EntityId[] = [];

    for (const fragment of fragments.values()) {
      let live = this.live.get(fragment.id);
      if (!live) {
        // A remounted system (StrictMode) with fragments still alive: restart
        // them from their stored spawn pose instead of freezing in place.
        live = {
          position: [fragment.position[0], fragment.position[1], fragment.position[2]],
          velocity: [fragment.velocity[0], fragment.velocity[1], fragment.velocity[2]],
        };
        this.live.set(fragment.id, live);
      }

      // Ballistic integration.
      live.velocity[1] += gravity * delta;
      live.position[0] += live.velocity[0] * delta;
      live.position[1] += live.velocity[1] * delta;
      live.position[2] += live.velocity[2] * delta;

      const age = now - fragment.bornAt;
      const remaining = 1 - age / fragment.lifetimeMs;

      if (remaining <= 0) {
        expired.push(fragment.id);
        continue;
      }

      const mesh = getFragmentMesh(fragment.id);
      if (mesh) {
        mesh.position.set(live.position[0], live.position[1], live.position[2]);
        // Shrink toward zero across the lifetime; the quadratic ease keeps
        // the last moments from looking like a hard pop-out.
        const scale = fragment.scale * definitionFor(fragment.kind).radius * remaining * remaining;
        mesh.scale.setScalar(Math.max(scale, 0.001));
      }
    }

    for (const id of expired) {
      this.live.delete(id);
      useFragmentStore.getState().remove(id);
      unregisterFragmentMesh(id);
    }
  }

  private handlePoke = (entityId: EntityId, healthLeft: number): void => {
    if (healthLeft > 0) return;
    const entity = useShapeStore.getState().entities.get(entityId);
    if (!entity || entity.state === "splitting" || entity.state === "merging") return;

    useShapeStore.getState().patch(entityId, { state: "splitting" });
    this.pendingSplit.set(entityId, performance.now() + SPLIT_RULES.telegraphMs);
  };

  /** Breaks every telegraphed entity whose window has elapsed. */
  private drainPending(now: number): void {
    if (this.pendingSplit.size === 0) return;

    for (const [entityId, breakAt] of this.pendingSplit) {
      if (now < breakAt) continue;
      this.pendingSplit.delete(entityId);

      // The shape may have vanished mid-telegraph (collected, fell out of
      // bounds) — nothing to break in that case.
      if (!useShapeStore.getState().entities.has(entityId)) continue;
      this.performSplit(entityId, now);
    }
  }

  /** Breaks `entityId` into fragments, inheriting its momentum. */
  private performSplit(entityId: EntityId, now: number): void {
    const store = useShapeStore.getState();
    const entity = store.entities.get(entityId);
    if (!entity) return;

    const body = getBody(entityId);
    const definition = definitionFor(entity.kind);
    const position = body?.translation();
    const velocity = body?.linvel();

    const origin: Vec3 = position ? [position.x, position.y, position.z] : entity.position;
    const inherited: Vec3 = velocity ? [velocity.x, velocity.y, velocity.z] : [0, 0, 0];

    store.remove(entityId);
    unregisterBody(entityId);

    const fragmentIds: EntityId[] = [];
    for (let i = 0; i < SPLIT_RULES.fragmentCount; i += 1) {
      // Evenly spread radially, with a deterministic jitter from the clock so
      // simultaneous splits never look like clones.
      const angle = (i / SPLIT_RULES.fragmentCount) * Math.PI * 2 + now * 0.001;
      const radialX = Math.cos(angle);
      const radialY = 0.6 + Math.random() * 0.5;
      const radialZ = Math.sin(angle);

      const fragment = useFragmentStore.getState().add({
        kind: entity.kind,
        scale: SPLIT_RULES.fragmentScale,
        position: [
          origin[0] + radialX * definition.radius * 0.4,
          origin[1] + radialY * definition.radius * 0.2,
          origin[2] + radialZ * definition.radius * 0.4,
        ],
        velocity: [
          inherited[0] * 0.5 + radialX * SPLIT_RULES.fragmentImpulse,
          inherited[1] * 0.5 + radialY * SPLIT_RULES.fragmentImpulse,
          inherited[2] * 0.5 + radialZ * SPLIT_RULES.fragmentImpulse,
        ],
        bornAt: now,
        lifetimeMs: SPLIT_RULES.fragmentLifetimeMs,
      });
      fragmentIds.push(fragment.id);
      this.live.set(fragment.id, {
        position: [fragment.position[0], fragment.position[1], fragment.position[2]],
        velocity: [fragment.velocity[0], fragment.velocity[1], fragment.velocity[2]],
      });
    }

    emitGame({ type: "despawn", entityId, reason: "split" });
    emitGame({
      type: "split",
      sourceId: entityId,
      fragmentIds,
      kind: entity.kind,
      position: origin,
    });
  }

  dispose(): void {
    this.unsubscribePoke();
    this.live.clear();
    this.pendingSplit.clear();
  }
}

/**
 * Minimal internal channel for poke events, so the split system subscribes
 * once instead of the interaction system reaching into it directly — systems
 * stay strangers to each other (Dependency Inversion at module scale).
 */
const pokeHandlers = new Set<(entityId: EntityId, healthLeft: number) => void>();

function subscribePoke(handler: (entityId: EntityId, healthLeft: number) => void): () => void {
  pokeHandlers.add(handler);
  return () => {
    pokeHandlers.delete(handler);
  };
}

/** Publishes a poke result; only the interaction system calls this. */
export function publishPoke(entityId: EntityId, healthLeft: number): void {
  for (const handler of pokeHandlers) handler(entityId, healthLeft);
}

