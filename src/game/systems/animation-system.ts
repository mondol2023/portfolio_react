import { ANIMATION_FEEL, DRAG_FEEL, INTERACTION, MERGE_RULES, SPAWN_RULES } from "../config/game-config";
import { definitionFor } from "../config/shape-registry";
import { getBaseEmissiveIntensity, getShapeMaterial } from "../materials/material-registry";
import { getBody } from "../physics/body-registry";
import { getShapeGroup, getShapeMesh, instancedMeshList } from "../render/render-registry";
import { useInteractionStore } from "../stores/interaction-store";
import { useShapeStore } from "../stores/shape-store";
import { prefersReducedMotion } from "../hooks/use-motion-preference";

import type { GameSystem, SystemContext } from "./types";
import type { AmbientItem } from "../entities/ambient-field";
import type { EntityId, ShapeKind } from "../types/game";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";

/**
 * Idle life for everything that moves without physics.
 *
 * - **Ambient field**: every registered `InstancedMesh` carries its layout
 *   params in `userData.ambientItems`; this system rewrites instance matrices
 *   each frame (bob, drift, tumble). One draw call per species, zero React.
 * - **Shape feedback**: one pass over the live entities drives each shape's
 *   mesh scale (hover pulse, a mid-merge charge pulse, and a spawn-intro
 *   overshoot every arrival gets — spawned, respawned, or a merge result),
 *   a shared species-level emissive flash while any shape of that kind is
 *   mid-merge, a local-position tremble while mid-split-telegraph (the group
 *   sits inside the physics-driven body, so this rides independently of it),
 *   and drag/throw squash-stretch (live body velocity → non-uniform scale on
 *   the shape's outer group — a separate transform from the mesh's own
 *   scale, so the two never fight).
 *
 * Reduced motion freezes the ambient drift and every one of the feedback
 * channels above — the merge/split state machines still run on their own
 * schedule, they just resolve with no visible telegraph, matching every host
 * scene's contract.
 */
export class AnimationSystem implements GameSystem {
  readonly id = "animation";

  // Scratch objects reused for every instance every frame — per-instance
  // allocation here would mean thousands of GCs per minute.
  private readonly matrix = new Matrix4();
  private readonly quaternion = new Quaternion();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly euler = new Euler();
  private readonly dragAxis = new Vector3();

  /** When each currently-merging shape's charge was first observed, ms. */
  private readonly mergeStart = new Map<EntityId, number>();
  /** Species whose material is currently boosted above its resting emissive intensity. */
  private flashingKinds = new Set<ShapeKind>();

  update({ delta, elapsed, now }: SystemContext): void {
    const reduced = prefersReducedMotion();
    this.updateAmbient(reduced, elapsed);
    this.updateShapeFeedback(reduced, now, delta);
  }

  private updateAmbient(reduced: boolean, elapsed: number): void {
    for (const mesh of instancedMeshList()) {
      const items = mesh.userData.ambientItems as AmbientItem[] | undefined;
      if (!items) continue;

      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        if (!item) continue;

        if (reduced) {
          // Exactly the resting pose the field was placed with.
          this.matrix.makeTranslation(item.x, item.y, item.z);
          mesh.setMatrixAt(i, this.matrix);
          continue;
        }

        const bob = Math.sin(elapsed * item.bobSpeed + item.phase) * item.bobAmplitude;
        const driftX = Math.sin(elapsed * item.driftSpeed + item.phase * 1.7) * item.driftAmplitude;
        const spin = elapsed * item.spinSpeed + item.phase;

        this.euler.set(spin * item.tumble[0], spin * item.tumble[1], spin * item.tumble[2]);
        this.quaternion.setFromEuler(this.euler);
        this.position.set(item.x + driftX, item.y + bob, item.z);
        this.scale.setScalar(item.scale);
        this.matrix.compose(this.position, this.quaternion, this.scale);
        mesh.setMatrixAt(i, this.matrix);
      }

      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /**
   * One pass over the interactive shapes driving every per-shape feedback
   * channel: hover pulse, merge charge (scale pulse + tracking for the
   * shared emissive flash), spawn-intro overshoot, the split telegraph's
   * tremble, and drag/throw squash-stretch.
   */
  private updateShapeFeedback(reduced: boolean, now: number, delta: number): void {
    const { entities } = useShapeStore.getState();
    const { hoveredId, draggingId } = useInteractionStore.getState();
    const meshSmoothing = 1 - Math.exp(-ANIMATION_FEEL.meshSmoothing * delta);
    const dragSmoothing = 1 - Math.exp(-DRAG_FEEL.stretchLambda * delta);
    const mergingKinds = new Set<ShapeKind>();

    for (const entity of entities.values()) {
      const mesh = getShapeMesh(entity.id);
      const group = getShapeGroup(entity.id);
      if (!mesh || !group) continue;

      // --- Mesh scale: hover/drag baseline, merge pulse, spawn-intro overshoot.
      const isHot = entity.id === hoveredId || entity.id === draggingId;
      let target = isHot && !reduced ? INTERACTION.hoverScale : 1;

      if (entity.state === "merging") {
        mergingKinds.add(entity.kind);
        if (!reduced) {
          let start = this.mergeStart.get(entity.id);
          if (start === undefined) {
            start = now;
            this.mergeStart.set(entity.id, start);
          }
          const progress = clamp01((now - start) / MERGE_RULES.chargeMs);
          // Converging pulse: oscillation frequency rises and its amplitude
          // decays as the charge nears completion, plus a small steady
          // growth so the pair visibly "leans in" right before fusing.
          const oscillation = Math.sin(progress * Math.PI * (5 + progress * 14));
          target *=
            1 +
            Math.max(oscillation, 0) * ANIMATION_FEEL.mergePulseAmplitude * (1 - progress) +
            progress * ANIMATION_FEEL.mergePulseGrowth;
        }
      } else {
        this.mergeStart.delete(entity.id);
      }

      if (!reduced) {
        const introAge = now - entity.bornAt;
        if (introAge >= 0 && introAge < SPAWN_RULES.introMs) {
          target *= introOvershoot(introAge / SPAWN_RULES.introMs);
        }
      }

      const currentScale = mesh.scale.x;
      const nextScale = currentScale + (target - currentScale) * meshSmoothing;
      if (Math.abs(nextScale - currentScale) > 0.0005) {
        mesh.scale.setScalar(Math.max(nextScale, 0.001));
      }

      // --- Group local position: split-telegraph tremble.
      if (entity.state === "splitting" && !reduced) {
        const magnitude = ANIMATION_FEEL.splitJitterAmount;
        group.position.set(
          (Math.random() - 0.5) * magnitude,
          (Math.random() - 0.5) * magnitude,
          (Math.random() - 0.5) * magnitude,
        );
      } else if (group.position.x !== 0 || group.position.y !== 0 || group.position.z !== 0) {
        group.position.set(0, 0, 0);
      }

      // --- Group scale: drag/throw squash-stretch, independent of mesh scale.
      const baseScale = definitionFor(entity.kind).radius;
      const body = getBody(entity.id);
      const velocity = !reduced && body ? body.linvel() : undefined;
      const speed = velocity ? Math.hypot(velocity.x, velocity.y, velocity.z) : 0;

      let stretchX = baseScale;
      let stretchY = baseScale;
      let stretchZ = baseScale;
      if (velocity && speed >= DRAG_FEEL.minSpeed) {
        this.dragAxis.set(velocity.x, velocity.y, velocity.z).multiplyScalar(1 / speed);
        const stretch = Math.min((speed - DRAG_FEEL.minSpeed) / 8, 1) * DRAG_FEEL.stretchMax;
        // Elongate along the velocity axis, compress the cross-section so
        // volume feels roughly conserved — a cheap per-axis approximation,
        // no per-frame matrix decomposition needed.
        stretchX = baseScale * (1 + stretch * (3 * this.dragAxis.x * this.dragAxis.x - 1) * 0.5);
        stretchY = baseScale * (1 + stretch * (3 * this.dragAxis.y * this.dragAxis.y - 1) * 0.5);
        stretchZ = baseScale * (1 + stretch * (3 * this.dragAxis.z * this.dragAxis.z - 1) * 0.5);
      }

      group.scale.x += (stretchX - group.scale.x) * dragSmoothing;
      group.scale.y += (stretchY - group.scale.y) * dragSmoothing;
      group.scale.z += (stretchZ - group.scale.z) * dragSmoothing;
    }

    // Drop tracking for charges that vanished mid-merge (collected, fell out
    // of bounds) rather than completing.
    for (const id of this.mergeStart.keys()) {
      if (!entities.has(id)) this.mergeStart.delete(id);
    }

    this.updateMergeFlash(mergingKinds, reduced, delta);
  }

  /** Eases each merging species' shared material toward a boosted emissive intensity, and back down once settled. */
  private updateMergeFlash(mergingKinds: Set<ShapeKind>, reduced: boolean, delta: number): void {
    if (mergingKinds.size === 0 && this.flashingKinds.size === 0) return;

    const smoothing = 1 - Math.exp(-ANIMATION_FEEL.meshSmoothing * delta);
    const touched = new Set<ShapeKind>(mergingKinds);
    for (const kind of this.flashingKinds) touched.add(kind);

    const stillFlashing = new Set<ShapeKind>();
    for (const kind of touched) {
      const material = getShapeMaterial(kind);
      const base = getBaseEmissiveIntensity(kind);
      const target = !reduced && mergingKinds.has(kind) ? base + ANIMATION_FEEL.mergeFlashBoost : base;
      const nextIntensity = material.emissiveIntensity + (target - material.emissiveIntensity) * smoothing;
      material.emissiveIntensity = nextIntensity;
      if (Math.abs(nextIntensity - base) > 0.01) stillFlashing.add(kind);
    }

    this.flashingKinds = stillFlashing;
  }
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Damped-sine overshoot: starts small, overshoots past 1, settles at 1 by the end of the window. */
function introOvershoot(progress: number): number {
  return 1 - Math.exp(-progress * ANIMATION_FEEL.introOvershootDecay) * Math.cos(progress * Math.PI * ANIMATION_FEEL.introOvershootFreq);
}
