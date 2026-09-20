"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { SCENE_SMOOTHING, damp, easeInOutSine } from "@/lib/experience/scene-motion";
import { sceneScroll } from "@/lib/experience/scene-scroll";
import { signature } from "@/lib/experience/scene-signature";

interface CameraRigProps {
  /**
   * The "three-camera-scroll" switch. Off holds the dolly at its rest framing
   * (the Hero waypoint) while every section-scene still reads real scroll.
   */
  scrollEnabled: boolean;
  reducedMotion: boolean;
  pointer: { current: { x: number; y: number } };
  /**
   * Inspect mode (§6.3): while true, `OrbitControls` owns the camera and this
   * rig must not touch it. On the frame this goes back to false, the rig
   * blends from wherever the orbit left the camera back to the scroll-implied
   * waypoint over `RELEASE_DURATION`, rather than snapping to it.
   */
  inspectActive: boolean;
}

interface Waypoint {
  position: THREE.Vector3Tuple;
  lookAt: THREE.Vector3Tuple;
  /** Focal length, effectively. Stays inside the spec's 40–55° band. */
  fov: number;
}

/**
 * The path the camera dollies along across the whole page, one waypoint per
 * section in actual DOM order — hero → about → skills → projects →
 * experience → contact. That order is measured from the rendered page, not
 * from `SECTION_TONES`' naming; an earlier revision of this file had Projects
 * and Experience the other way round, which handed the corridor Experience's
 * slot on the path and left it to run its entrance over the wrong section
 * entirely. Moves are small and mostly lateral or vertical drift: "smooth
 * interpolation, no shake, no roller-coaster zoom."
 *
 * Two things the path carries beyond position. It leans *away* from whichever
 * side a section's object occupies, so the object lands in the page's own
 * negative space rather than dead centre behind an opaque card grid. And each
 * waypoint names a focal length: the lens tightens to 43° at Projects, where
 * the corridor wants compression and depth, and opens to 51° at Contact,
 * where the scene is meant to feel like it is letting go. Four degrees across
 * a whole section is a lens change, not a zoom — it is never perceptible as
 * movement, only as a change of mood.
 */
const PATH: Waypoint[] = [
  { position: [0, 0, 6], lookAt: [0, 0, 0], fov: 46 }, // hero
  { position: [1.15, 0.35, 5.4], lookAt: [0.2, 0.05, -0.4], fov: 47 }, // about
  { position: [-1.35, 0.5, 5.6], lookAt: [-0.25, 0.1, -0.4], fov: 48 }, // skills
  // Projects sits on the centre axis looking straight down the corridor, so
  // both walls read symmetrically in the page's side gutters. The eyeline is
  // a little above the camera rather than level with it: the corridor ends in
  // a wall whose lit top edge is the one line the composition leads to, and
  // aiming fractionally above the horizontal puts that edge where the eye
  // already is instead of below the fold of the card grid. Six hundredths of a
  // unit over eight is under a degree and a half — a framing choice, not a
  // move anyone can see happen.
  { position: [0, 0.06, 5.1], lookAt: [0, 0.16, -3.6], fov: 43 }, // projects
  { position: [1.05, -0.3, 5.6], lookAt: [0.15, -0.12, -0.7], fov: 47 }, // experience
  { position: [0, 0, 6.8], lookAt: [0, 0, 0], fov: 51 }, // contact
];

/** How far the camera drifts with the cursor. Parallax, not a flight control. */
const PARALLAX_X = 0.18;
const PARALLAX_Y = 0.1;

const scratchPosition = new THREE.Vector3();
const scratchLookAt = new THREE.Vector3();
const scratchArrivedPosition = new THREE.Vector3();
const scratchArrivedQuaternion = new THREE.Quaternion();

/** How long the hand-back from Inspect mode takes to land on the waypoint (§6.3). */
const RELEASE_DURATION = 0.6;

/** How many waypoints — and so how many DOM sections — the shared camera path covers. */
export const SCENE_SECTION_COUNT = PATH.length;

/**
 * Local 0–1 progress within one section-to-next-section span of the shared
 * camera path, e.g. `sceneSectionProgress(progress, 0)` is 0 at rest in Hero
 * and 1 once the camera has fully arrived at About. Lets each section-scene
 * derive its own scroll-driven transform from the same single `progress`
 * value `CameraRig` already uses, without re-deriving the path or hard-coding
 * a second copy of its waypoint count.
 *
 * Deliberately linear: sections apply their own easing (and several need the
 * raw ramp to stagger against), so easing it here would double-apply.
 */
export function sceneSectionProgress(progress: number, index: number): number {
  const span = PATH.length - 1;
  const t = THREE.MathUtils.clamp(progress, 0, 1) * span;
  return THREE.MathUtils.clamp(t - index, 0, 1);
}

/** How much of its span an entrance finishes within; the rest of the span is dwell. */
const ENTRY_SETTLE = 0.72;
/** How much of its span an exit waits through before it starts. */
const EXIT_HOLD = 0.28;

/**
 * A section's entry and exit ramps, shaped so the section has a *middle*.
 *
 * Read straight off the path, a section's entrance completes at the exact
 * instant its exit begins — every section is either arriving or leaving and
 * none is ever simply there, which is why the scene could feel busy without
 * anything in it moving fast. Finishing the entrance inside the first ~70% of
 * its span and holding the exit until ~30% into the next one buys each
 * section a plateau where its composition just sits, which is the "moments of
 * calm" half of `calm → build → peak → release → calm`.
 *
 * `index` is the section's own waypoint index. Hero is the one section that
 * does not use this: its sculpture deliberately lives through About, so it
 * reads one span further along than the uniform rule here.
 */
export function sceneSectionEnvelope(progress: number, index: number): { entry: number; exit: number } {
  const entrySpan = index === 0 ? 1 : sceneSectionProgress(progress, index - 1);
  const exitSpan = sceneSectionProgress(progress, index);

  return {
    entry: THREE.MathUtils.clamp(entrySpan / ENTRY_SETTLE, 0, 1),
    exit: THREE.MathUtils.clamp((exitSpan - EXIT_HOLD) / (1 - EXIT_HOLD), 0, 1),
  };
}

/**
 * Drives the persistent camera from `progress` alone. Renders nothing; it
 * only calls `useFrame` on the shared camera instance every other scene
 * component in the canvas reads via `useThree()`.
 *
 * Scroll is linear, so interpolating waypoints linearly makes the camera
 * arrive and leave at the same constant speed — which is the difference
 * between a dolly and a conveyor belt. Easing the span instead gives every
 * section a settled middle and a soft hand-off at each end, which is what
 * "calm → build → peak → release → calm" needs to be legible at all.
 */
export function CameraRig({ scrollEnabled, reducedMotion, pointer, inspectActive }: CameraRigProps) {
  const { camera } = useThree();
  const parallax = useRef({ x: 0, y: 0 });
  const wasInspecting = useRef(false);
  const releaseFrom = useRef<{ position: THREE.Vector3; quaternion: THREE.Quaternion } | null>(null);
  const releaseElapsed = useRef(0);

  useFrame((_state, delta) => {
    // Ceded entirely: `OrbitControls` (`inspect-controls.tsx`) owns the camera
    // while Inspect mode is active, and this rig must not fight it for a
    // single frame.
    if (inspectActive) {
      wasInspecting.current = true;
      return;
    }
    if (wasInspecting.current) {
      wasInspecting.current = false;
      releaseFrom.current = { position: camera.position.clone(), quaternion: camera.quaternion.clone() };
      releaseElapsed.current = 0;
    }

    const span = PATH.length - 1;
    const progress = scrollEnabled ? sceneScroll.progress : 0;
    const t = THREE.MathUtils.clamp(progress, 0, 1) * span;
    const i = Math.min(Math.floor(t), span - 1);
    const local = easeInOutSine(t - i);

    const a = PATH[i] ?? PATH[0]!;
    const b = PATH[i + 1] ?? a;

    // Parallax rides on top of the path rather than replacing any of it, so
    // the cursor can never pull the camera off its choreography — and it
    // decays to centre on its own when the pointer leaves the window.
    const targetX = reducedMotion ? 0 : THREE.MathUtils.clamp(pointer.current.x, -1, 1) * PARALLAX_X;
    const targetY = reducedMotion ? 0 : THREE.MathUtils.clamp(pointer.current.y, -1, 1) * PARALLAX_Y;
    parallax.current.x = damp(parallax.current.x, targetX, SCENE_SMOOTHING.cinematic, delta);
    parallax.current.y = damp(parallax.current.y, targetY, SCENE_SMOOTHING.cinematic, delta);

    // The signature moment's push and release (§5) — an offset on the path, not
    // a second path, and zero at both ends of its window, so the rig stays the
    // only thing deciding where the camera is.
    // The corridor runs down -Z, so pushing toward the wall is subtraction.
    const push = scrollEnabled ? signature.push : 0;

    scratchPosition.set(
      THREE.MathUtils.lerp(a.position[0], b.position[0], local) + parallax.current.x,
      THREE.MathUtils.lerp(a.position[1], b.position[1], local) + parallax.current.y,
      THREE.MathUtils.lerp(a.position[2], b.position[2], local) - push,
    );
    scratchLookAt.set(
      // The target counter-rotates a fraction of the parallax, so the cursor
      // swings the camera *around* the subject instead of panning off it.
      THREE.MathUtils.lerp(a.lookAt[0], b.lookAt[0], local) - parallax.current.x * 0.25,
      THREE.MathUtils.lerp(a.lookAt[1], b.lookAt[1], local) - parallax.current.y * 0.25,
      THREE.MathUtils.lerp(a.lookAt[2], b.lookAt[2], local),
    );

    // Set, not damped: `sceneScroll.progress` arrives already spring-smoothed
    // by `<ScrollPhysics>`, and a second filter on the same value would only
    // stack lag onto weight that has already been applied.
    camera.position.copy(scratchPosition);
    camera.lookAt(scratchLookAt);

    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = THREE.MathUtils.lerp(a.fov, b.fov, local);
      const nextFov = reducedMotion ? targetFov : damp(camera.fov, targetFov, SCENE_SMOOTHING.cinematic, delta);
      // Rebuilding the projection matrix is not free, and below a hundredth
      // of a degree the change cannot be seen anyway.
      if (Math.abs(nextFov - camera.fov) > 0.01) {
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    }

    // The hand-back from Inspect mode (§6.3): blend from the free-orbit pose
    // toward the waypoint the rig just computed above, rather than cutting to
    // it. `camera.position`/`camera.quaternion` already hold the "arrived"
    // pose at this point, so they are the blend's target, captured before
    // being overwritten by the blend itself.
    if (releaseFrom.current) {
      releaseElapsed.current += delta;
      const t = easeInOutSine(Math.min(1, releaseElapsed.current / RELEASE_DURATION));
      scratchArrivedPosition.copy(camera.position);
      scratchArrivedQuaternion.copy(camera.quaternion);
      camera.position.lerpVectors(releaseFrom.current.position, scratchArrivedPosition, t);
      camera.quaternion.slerpQuaternions(releaseFrom.current.quaternion, scratchArrivedQuaternion, t);
      if (t >= 1) releaseFrom.current = null;
    }
  });

  return null;
}
