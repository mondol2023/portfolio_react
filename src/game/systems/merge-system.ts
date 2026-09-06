import { FUSION, MERGE_RULES } from "../config/game-config";
import { fuseKinds, partsOf } from "../config/fusion";
import { definitionFor } from "../config/shape-registry";
import { getBody, setBodySeed, unregisterBody } from "../physics/body-registry";
import { useShapeStore } from "../stores/shape-store";
import { emitGame } from "../events/game-bus";

import type { GameSystem, SystemContext } from "./types";
import type { EntityId, ShapeEntity, ShapeKind, Vec3 } from "../types/game";

/**
 * Fuses overlapping shapes into a single composite body.
 *
 * Any two shapes may fuse — there is no ladder and no family or tier gate. What
 * gates a fusion is *overlap*: the two bodies have to genuinely interpenetrate,
 * by `MERGE_RULES.overlapRatio` of the smaller one's radius, before they count
 * as touching. Mere contact isn't enough, because in zero-g shapes drift into
 * each other constantly and fusing on first brush would collapse the whole
 * population within seconds of load.
 *
 * The result's kind is the union of both recipes (`fuseKinds`), so it carries
 * every ingredient's geometry and volume — see `config/fusion.ts` for the
 * identity and `config/shape-registry.ts` for the arithmetic. A composite stops
 * accepting new parts at `FUSION.maxParts`.
 *
 * Detection is a pairwise pass over the interactive population, which peaks
 * around a dozen shapes — 66 pairs, trivially cheap, and far more controllable
 * than plumbing Rapier collision events through component props.
 *
 * A found pair doesn't fuse instantly — both shapes are patched to `"merging"`
 * (which also excludes them from being re-matched, since the scan only
 * considers idle shapes) and the fuse is scheduled `MERGE_RULES.chargeMs` out,
 * giving `AnimationSystem` a short window to sell the impact before the swap
 * happens. If either shape vanishes before then (collected, fell out of
 * bounds), the charge is simply dropped.
 */
export class MergeSystem implements GameSystem {
  readonly id = "merge";

  /** Pairs mid-charge, keyed by a stable sorted-id pair key. */
  private readonly charging = new Map<string, PendingMerge & { applyAt: number }>();

  update({ now }: SystemContext): void {
    this.drainCharges(now);

    const { entities } = useShapeStore.getState();
    if (entities.size < 2) return;

    const idle: ShapeEntity[] = [];
    for (const entity of entities.values()) {
      if (entity.state === "idle" && now >= entity.mergeLockUntil) idle.push(entity);
    }

    const pending: PendingMerge[] = [];
    const consumed = new Set<EntityId>();

    for (let i = 0; i < idle.length; i += 1) {
      const primary = idle[i];
      if (!primary || consumed.has(primary.id)) continue;

      const primaryDefinition = definitionFor(primary.kind);
      if (!primaryDefinition.mergeable) continue;

      const primaryBody = getBody(primary.id);
      if (!primaryBody) continue;

      const pPos = primaryBody.translation();
      const pVel = primaryBody.linvel();
      const pRadius = primaryDefinition.radius;
      const pParts = partsOf(primary.kind).length;

      for (let j = i + 1; j < idle.length; j += 1) {
        const secondary = idle[j];
        if (!secondary || consumed.has(secondary.id)) continue;

        const secondaryDefinition = definitionFor(secondary.kind);
        if (!secondaryDefinition.mergeable) continue;

        // The ceiling is on the *combined* recipe: a three-part composite and a
        // two-part one can't fuse into a five-part blob just because each side
        // was individually still under the limit.
        if (pParts + partsOf(secondary.kind).length > FUSION.maxParts) continue;

        const secondaryBody = getBody(secondary.id);
        if (!secondaryBody) continue;

        const sPos = secondaryBody.translation();
        const sVel = secondaryBody.linvel();
        const sRadius = secondaryDefinition.radius;

        // Overlap, not proximity: subtract a share of the smaller radius from
        // the touching distance so the two have to be visibly inside one
        // another before they fuse.
        const reach = pRadius + sRadius - Math.min(pRadius, sRadius) * MERGE_RULES.overlapRatio;
        const dx = sPos.x - pPos.x;
        const dy = sPos.y - pPos.y;
        const dz = sPos.z - pPos.z;

        if (dx * dx + dy * dy + dz * dz > reach * reach) continue;

        consumed.add(primary.id);
        consumed.add(secondary.id);
        pending.push({
          primary,
          secondary,
          resultKind: fuseKinds(primary.kind, secondary.kind),
          position: [(pPos.x + sPos.x) / 2, (pPos.y + sPos.y) / 2, (pPos.z + sPos.z) / 2],
          velocity: [
            (pVel.x + sVel.x) * 0.5,
            (pVel.y + sVel.y) * 0.5 + 0.4,
            (pVel.z + sVel.z) * 0.5,
          ],
        });
        break;
      }
    }

    if (pending.length === 0) return;

    const shapeStore = useShapeStore.getState();
    for (const merge of pending) {
      shapeStore.setState(merge.primary.id, "merging");
      shapeStore.setState(merge.secondary.id, "merging");
      const key = mergeKey(merge.primary.id, merge.secondary.id);
      this.charging.set(key, { ...merge, applyAt: now + MERGE_RULES.chargeMs });
    }
  }

  /** Fuses every charge whose window has elapsed, dropping any that no longer both exist. */
  private drainCharges(now: number): void {
    if (this.charging.size === 0) return;

    for (const [key, merge] of this.charging) {
      if (now < merge.applyAt) continue;
      this.charging.delete(key);

      const { entities } = useShapeStore.getState();
      if (!entities.has(merge.primary.id) || !entities.has(merge.secondary.id)) continue;

      this.apply(merge, now);
    }
  }

  private apply(merge: PendingMerge, now: number): void {
    const store = useShapeStore.getState();

    store.remove(merge.primary.id);
    store.remove(merge.secondary.id);
    unregisterBody(merge.primary.id);
    unregisterBody(merge.secondary.id);

    const result = store.add({
      kind: merge.resultKind,
      now,
      position: merge.position,
      mergeLockUntil: now + MERGE_RULES.resultLockMs,
    });
    setBodySeed(result.id, merge.velocity);

    emitGame({ type: "despawn", entityId: merge.primary.id, reason: "merged" });
    emitGame({ type: "despawn", entityId: merge.secondary.id, reason: "merged" });
    emitGame({
      type: "merge",
      resultId: result.id,
      sources: [merge.primary.id, merge.secondary.id],
      kind: merge.resultKind,
      position: merge.position,
    });
  }
}

/** Local shape of a queued merge — the scan and the apply share it. */
interface PendingMerge {
  primary: ShapeEntity;
  secondary: ShapeEntity;
  resultKind: ShapeKind;
  position: Vec3;
  velocity: Vec3;
}

/** Stable key for a charging pair, order-independent so either scan order matches it. */
function mergeKey(a: EntityId, b: EntityId): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}
