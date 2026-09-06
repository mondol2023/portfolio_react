import { BUDGET_PRESETS, IMPACT_RINGS } from "../config/game-config";
import { readTonePalette } from "../config/palette";
import { getImpactRingMesh, unregisterImpactRingMesh } from "../render/render-registry";
import { useImpactStore, type ImpactKind } from "../stores/impact-store";
import { prefersReducedMotion } from "../hooks/use-motion-preference";

import type { GameBudget, GameSystem, SystemContext } from "./types";
import type { EntityId, Vec3 } from "../types/game";
import type { MeshBasicMaterial } from "three";

/** Ring tint per impact kind — read live so theme switches re-tint new rings. */
function colorFor(kind: ImpactKind): string {
  const palette = readTonePalette();
  switch (kind) {
    case "merge":
      return palette.accent;
    case "collect":
      return "#ffd659"; // warm gold — matches the particle system's collect burst
    case "split":
    default:
      return palette.tone;
  }
}

/**
 * Whether the live world wants impact rings at all — set once by
 * `ImpactSystem`'s constructor from the active budget, read by `requestImpact`
 * below. A module-level flag rather than an instance method call, the same
 * "strangers to each other" pattern `split-system.ts` uses for
 * `publishPoke`/`subscribePoke`: `ScoreSystem` enqueues without ever knowing
 * an `ImpactSystem` instance exists.
 */
let impactsEnabled = false;

/**
 * Called by `ScoreSystem.award()` right next to its particle-burst enqueue —
 * no new `GameEvent` type needed. No-ops on the `low` budget tier (the
 * particle burst already carries the feedback there) and under reduced
 * motion (an expanding ring is motion, not just decoration).
 */
export function requestImpact(kind: ImpactKind, position: Vec3, now: number): void {
  if (!impactsEnabled || prefersReducedMotion()) return;
  useImpactStore.getState().add({ kind, position, bornAt: now });
}

/**
 * Expanding, fading shockwave rings that punctuate merge/split/collect.
 *
 * Integrated here exactly like `SplitSystem` integrates fragments: scale
 * eases from `IMPACT_RINGS.startScale` to `endScale` while opacity fades from
 * `startOpacity` to 0, over `IMPACT_RINGS.lifetimeMs`. New rings arrive via
 * `requestImpact` (module-level, see above) rather than a direct reference —
 * this system only ever reads the store it owns.
 */
export class ImpactSystem implements GameSystem {
  readonly id = "impact";

  private readonly live = new Set<EntityId>();
  /** Rings whose material has already received its one-time kind tint. */
  private readonly tinted = new Set<EntityId>();

  constructor(budget: GameBudget) {
    impactsEnabled = budget.particleBudget > BUDGET_PRESETS.low.particleBudget;
  }

  update({ now }: SystemContext): void {
    const { rings } = useImpactStore.getState();
    // Pick up anything `requestImpact` added since last frame.
    for (const id of rings.keys()) this.live.add(id);
    if (this.live.size === 0) return;

    const expired: EntityId[] = [];

    for (const id of this.live) {
      const ring = rings.get(id);
      if (!ring) {
        expired.push(id);
        continue;
      }

      const age = now - ring.bornAt;
      const progress = Math.min(age / IMPACT_RINGS.lifetimeMs, 1);

      const mesh = getImpactRingMesh(id);
      if (mesh) {
        const scale = IMPACT_RINGS.startScale + (IMPACT_RINGS.endScale - IMPACT_RINGS.startScale) * progress;
        mesh.scale.setScalar(scale);
        // The ring's material is created generic (see `createImpactRingMaterial`)
        // since the mesh mounts before its kind is known here; tint it once
        // the first time it's seen, then just fade.
        const material = mesh.material as MeshBasicMaterial;
        if (!this.tinted.has(id)) {
          material.color.set(colorFor(ring.kind));
          this.tinted.add(id);
        }
        material.opacity = IMPACT_RINGS.startOpacity * (1 - progress);
      }

      if (progress >= 1) expired.push(id);
    }

    for (const id of expired) {
      this.live.delete(id);
      this.tinted.delete(id);
      useImpactStore.getState().remove(id);
      unregisterImpactRingMesh(id);
    }
  }

  dispose(): void {
    this.live.clear();
    this.tinted.clear();
    useImpactStore.getState().clear();
  }
}
