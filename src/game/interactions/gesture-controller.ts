import { INTERACTION } from "../config/game-config";
import { playCue, primeAudio } from "../audio/audio-controller";
import { emitGame } from "../events/game-bus";
import { pointerTracker, installPointerTracker } from "./pointer-tracker";
import { isBlockedTarget } from "./event-filter";
import { publishCollectFlyoff } from "./collect-flyoff-bus";
import { getBody } from "../physics/body-registry";
import { shapeMeshList } from "../render/render-registry";
import { useInteractionStore } from "../stores/interaction-store";
import { useParticleStore } from "../stores/particle-store";
import { useShapeStore } from "../stores/shape-store";
import { publishPoke } from "../systems/split-system";

import type { EntityId, Vec3 } from "../types/game";
import { Raycaster, Vector2, Vector3, type Camera } from "three";

interface Grab {
  entityId: EntityId;
  /** Distance along the pointer ray where the body was grabbed. */
  depth: number;
  startedAt: number;
  startX: number;
  startY: number;
  moved: boolean;
}

/**
 * The gesture state machine behind the interaction system.
 *
 * Owns the window listeners, the raycast picking, and the grab lifecycle —
 * everything *deciding*. The interaction system calls into it once per frame
 * with the live camera; the listeners themselves only mutate state, so a
 * pointer moving at 500 Hz costs nothing extra.
 *
 * Gestures: tap = poke · drag = velocity-driven grab · fast release = throw ·
 * hold = collect. Every press is filtered through `isBlockedTarget` first —
 * content always wins.
 */
export class GestureController {
  private readonly raycaster = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly dragTarget = new Vector3();
  private readonly bodyPoint = new Vector3();
  private readonly projectionPoint = new Vector3();

  private grab: Grab | null = null;
  private activeCamera: Camera | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private cursorClaimed = false;

  constructor() {
    installPointerTracker();
    window.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    const { armed } = useInteractionStore.getState();
    if (!armed || event.button !== 0 || isBlockedTarget(event.target)) return;

    // A real user gesture: the safest moment to unlock the AudioContext. The
    // call is idempotent and costs nothing once armed.
    primeAudio();

    pointerTracker.current.client.x = event.clientX;
    pointerTracker.current.client.y = event.clientY;

    const entityId = this.pick(event.clientX, event.clientY);
    const body = entityId ? getBody(entityId) : undefined;
    if (!entityId || !body || !this.activeCamera) return;

    // Claimed gesture: preventDefault stops the text selection this press
    // would otherwise begin. Never done for presses that missed every shape.
    event.preventDefault();

    this.ndc.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -((event.clientY / window.innerHeight) * 2 - 1),
    );
    this.raycaster.setFromCamera(this.ndc, this.activeCamera);
    const position = body.translation();
    this.bodyPoint.set(position.x, position.y, position.z);

    this.grab = {
      entityId,
      depth: this.raycaster.ray.origin.distanceTo(this.bodyPoint),
      startedAt: performance.now(),
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };

    useShapeStore.getState().setState(entityId, "dragged");
    useInteractionStore.getState().setDragging(entityId);
    body.wakeUp();

    // Hold-to-collect: armed on press, cancelled by movement or release.
    this.longPressTimer = setTimeout(() => {
      this.collect(entityId);
      this.grab = null;
    }, INTERACTION.longPressMs);
  };

  private readonly onPointerUp = (): void => {
    this.clearLongPress();

    const grab = this.grab;
    if (!grab) return;
    this.grab = null;

    useShapeStore.getState().setState(grab.entityId, "idle");
    useInteractionStore.getState().setDragging(null);

    const body = getBody(grab.entityId);
    if (!body) return;

    const duration = performance.now() - grab.startedAt;
    const travel = Math.hypot(
      pointerTracker.current.client.x - grab.startX,
      pointerTracker.current.client.y - grab.startY,
    );

    if (!grab.moved && travel < INTERACTION.tapMaxDistancePx && duration < INTERACTION.tapMaxDurationMs) {
      this.poke(grab.entityId);
      return;
    }

    const velocity = body.linvel();
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
    if (speed > INTERACTION.flickSpeed) {
      body.setLinvel(
        {
          x: velocity.x * INTERACTION.throwMultiplier,
          y: velocity.y * INTERACTION.throwMultiplier,
          z: velocity.z * INTERACTION.throwMultiplier,
        },
        true,
      );
      playCue("throw");
      emitGame({ type: "throw", entityId: grab.entityId, speed });
    }
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const grab = this.grab;
    if (!grab) return;

    const travel = Math.hypot(event.clientX - grab.startX, event.clientY - grab.startY);
    if (travel > INTERACTION.tapMaxDistancePx) {
      grab.moved = true;
      this.clearLongPress();
    }
  };

  /** Per-frame entry point: drag forces, then hover picking, then hold charge. */
  update(camera: Camera, delta: number): void {
    this.activeCamera = camera;
    this.updateDrag(delta);
    this.updateHover();
    this.updateCollectProgress();
  }

  private updateDrag(delta: number): void {
    const grab = this.grab;
    const camera = this.activeCamera;
    if (!grab || !camera) return;

    const body = getBody(grab.entityId);
    if (!body) return;

    this.ndc.set(pointerTracker.current.ndc.x, pointerTracker.current.ndc.y);
    this.raycaster.setFromCamera(this.ndc, camera);

    // Target = a point on the pointer ray at the grab depth. Dragging is
    // velocity-driven: responsive, carries natural momentum into a throw,
    // and sidesteps the tunnelling stiff forces can cause.
    this.dragTarget.copy(this.raycaster.ray.direction).multiplyScalar(grab.depth).add(this.raycaster.ray.origin);

    const translation = body.translation();
    const desiredX = (this.dragTarget.x - translation.x) * INTERACTION.dragStiffness;
    const desiredY = (this.dragTarget.y - translation.y) * INTERACTION.dragStiffness;
    const desiredZ = (this.dragTarget.z - translation.z) * INTERACTION.dragStiffness;

    const speed = Math.hypot(desiredX, desiredY, desiredZ);
    const scale = speed > INTERACTION.maxDragSpeed ? INTERACTION.maxDragSpeed / speed : 1;

    const smoothing = 1 - Math.exp(-18 * delta);
    const velocity = body.linvel();
    body.setLinvel(
      {
        x: velocity.x + (desiredX * scale - velocity.x) * smoothing,
        y: velocity.y + (desiredY * scale - velocity.y) * smoothing,
        z: velocity.z + (desiredZ * scale - velocity.z) * smoothing,
      },
      false,
    );
  }

  private updateHover(): void {
    if (!pointerTracker.current.dirty) return;
    pointerTracker.current.dirty = false;

    if (useInteractionStore.getState().draggingId) return;

    const { client } = pointerTracker.current;
    const entityId = this.pick(client.x, client.y);
    useInteractionStore.getState().setHovered(entityId);

    // Cursor affordance — only when the element under the pointer is not one
    // the document itself cares about.
    const overContent = isBlockedTarget(document.elementFromPoint(client.x, client.y));
    if (entityId && !overContent && !this.cursorClaimed) {
      document.body.style.cursor = "grab";
      this.cursorClaimed = true;
    } else if ((!entityId || overContent) && this.cursorClaimed) {
      document.body.style.cursor = "";
      this.cursorClaimed = false;
    }
  }

  /**
   * Publishes the hold-to-collect charge every frame so `collect-ring.tsx`
   * can render it live. Movement cancels the long-press timer (see
   * `onPointerMove`) but doesn't null the grab until release, so `moved` is
   * checked here too — the ring must vanish the instant a hold turns into a
   * drag, not linger at whatever progress it had reached.
   */
  private updateCollectProgress(): void {
    const grab = this.grab;
    if (!grab || grab.moved) {
      useInteractionStore.getState().setCollectCharge(0, null);
      return;
    }

    const progress = Math.min((performance.now() - grab.startedAt) / INTERACTION.longPressMs, 1);
    useInteractionStore.getState().setCollectCharge(progress, { x: grab.startX, y: grab.startY });
  }

  /** Raycasts the interactive meshes; returns the shape under the pointer. */
  private pick(clientX: number, clientY: number): EntityId | null {
    const camera = this.activeCamera;
    if (!camera) return null;

    this.ndc.set((clientX / window.innerWidth) * 2 - 1, -((clientY / window.innerHeight) * 2 - 1));
    this.raycaster.setFromCamera(this.ndc, camera);

    const hits = this.raycaster.intersectObjects(shapeMeshList(), false);
    const hit = hits.find((candidate) => typeof candidate.object.userData.entityId === "string");
    return hit ? (hit.object.userData.entityId as EntityId) : null;
  }

  private poke(entityId: EntityId): void {
    const result = useShapeStore.getState().registerPoke(entityId);
    if (!result) return;
    playCue("poke");
    emitGame({
      type: "poke",
      entityId,
      kind: result.entity.kind,
      healthLeft: result.healthLeft,
    });
    publishPoke(entityId, result.healthLeft);
  }

  private collect(entityId: EntityId): void {
    const store = useShapeStore.getState();
    const entity = store.entities.get(entityId);
    if (!entity) return;

    const body = getBody(entityId);
    const position = body?.translation();

    store.remove(entityId);
    useInteractionStore.getState().setDragging(null);
    // Charge complete: the ring's job is done, clear it now rather than
    // waiting for next frame's self-heal in `updateCollectProgress`.
    useInteractionStore.getState().setCollectCharge(0, null);

    const at: Vec3 = position ? [position.x, position.y, position.z] : entity.position;

    // One-off world-to-screen projection for the HUD fly-off ghost — a single
    // call at the moment of collect, not a per-frame tracked position.
    const camera = this.activeCamera;
    if (camera) {
      this.projectionPoint.set(at[0], at[1], at[2]).project(camera);
      publishCollectFlyoff({
        x: (this.projectionPoint.x * 0.5 + 0.5) * window.innerWidth,
        y: (this.projectionPoint.y * -0.5 + 0.5) * window.innerHeight,
      });
    }

    useParticleStore.getState().enqueue({ kind: "collect", position: at, strength: 1 });
    // No cue here: the score system owns the sound for scoring events, so a
    // collect can never chime twice.
    emitGame({ type: "collect", entityId, kind: entity.kind, points: entity.value, position: at });
  }

  private clearLongPress(): void {
    if (this.longPressTimer !== null) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  dispose(): void {
    window.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("pointercancel", this.onPointerUp);
    window.removeEventListener("pointermove", this.onPointerMove);
    this.clearLongPress();
    if (this.cursorClaimed) {
      document.body.style.cursor = "";
      this.cursorClaimed = false;
    }
  }
}
