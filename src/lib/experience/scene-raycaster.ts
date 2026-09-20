/**
 * A real `Raycaster` for the site scene, generalising Game Mode's
 * `gesture-controller.ts` pattern (S7). The canvas stays `pointer-events-none`
 * — this never enables R3F's event system, it only gives object files a way
 * to ask "what is under the cursor" with an actual ray instead of a
 * screen-space NDC guess.
 *
 * One `Raycaster`, one NDC `Vector2`, module scope — no allocation per frame.
 * Only objects passed to `registerInteractive` are ever tested.
 */

import * as THREE from "three";

import { SCROLL_RAY_SUSPEND, sceneScroll } from "./scene-scroll";

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

/** Meta is opaque to this module — callers stash whatever they need to recover on a hit. */
const registry = new Map<THREE.Object3D, unknown>();
const registryList: THREE.Object3D[] = [];

/** Opts one object into raycasting. Returns the unregister function. */
export function registerInteractive<T>(object: THREE.Object3D, meta?: T): () => void {
  registry.set(object, meta);
  registryList.push(object);
  return () => {
    registry.delete(object);
    const index = registryList.indexOf(object);
    if (index !== -1) registryList.splice(index, 1);
  };
}

/** The meta value passed at registration, or undefined for an object that was never registered. */
export function interactiveMeta<T>(object: THREE.Object3D): T | undefined {
  return registry.get(object) as T | undefined;
}

/**
 * Nearest registered hit under `pointerNdc`, or null. Recursion off (§6.2) —
 * only the registered objects themselves are tested, never their children.
 */
export function pickNearest(
  camera: THREE.Camera,
  pointerNdc: { x: number; y: number },
): THREE.Intersection | null {
  if (registryList.length === 0) return null;
  ndc.set(pointerNdc.x, pointerNdc.y);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(registryList, false);
  return hits[0] ?? null;
}

/**
 * `pickNearest` for continuous hover, throttled per §6.2: every other frame, and
 * off above `SCROLL_RAY_SUSPEND`. A factory — the cache must be per-caller.
 */
export function createHoverPicker(): (
  camera: THREE.Camera,
  pointerNdc: { x: number; y: number },
) => THREE.Intersection | null {
  let frame = 0;
  let last: THREE.Intersection | null = null;

  return (camera, pointerNdc) => {
    if (Math.abs(sceneScroll.velocity) > SCROLL_RAY_SUSPEND) {
      last = null;
      return null;
    }
    frame += 1;
    // Off frames reuse the last hit, so a held hover doesn't flicker at 30Hz.
    if (frame % 2 === 0) return last;
    last = pickNearest(camera, pointerNdc);
    return last;
  };
}

const scratchDirection = new THREE.Vector3();

/**
 * A plane through `point`, facing the camera (§6.4.2). This is the drag
 * surface: the dragged object is assumed to stay at the depth it was grabbed
 * at, and the pointer ray is projected onto that plane every subsequent move.
 */
export function dragPlaneThroughPoint(camera: THREE.Camera, point: THREE.Vector3, out: THREE.Plane): THREE.Plane {
  camera.getWorldDirection(scratchDirection);
  return out.setFromNormalAndCoplanarPoint(scratchDirection, point);
}

/**
 * Where the pointer ray currently meets `plane`, in world space — or null
 * when the ray runs parallel to it (§6.4.3). This is the coordinate
 * transformation a drag actually needs: ray → world point → the caller's own
 * `worldToLocal`.
 */
export function dragPointOnPlane(
  camera: THREE.Camera,
  pointerNdc: { x: number; y: number },
  plane: THREE.Plane,
  out: THREE.Vector3,
): THREE.Vector3 | null {
  ndc.set(pointerNdc.x, pointerNdc.y);
  raycaster.setFromCamera(ndc, camera);
  return raycaster.ray.intersectPlane(plane, out);
}
