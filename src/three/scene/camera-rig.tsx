"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

interface CameraRigProps {
  /** Whole-page scroll fraction, 0–1 — the single story parameter driving the camera. */
  progress: number;
  reducedMotion: boolean;
}

interface Waypoint {
  position: THREE.Vector3Tuple;
  lookAt: THREE.Vector3Tuple;
}

/**
 * The path the camera dollies along across the whole page, one waypoint per
 * section in actual DOM order (hero → about → skills → experience →
 * projects → contact — see `AGENTS.md`'s audit note on why that order does
 * not match `SECTION_TONES`' naming). Moves are small and mostly lateral or
 * vertical drift: "smooth interpolation, no shake, no roller-coaster zoom."
 * Later phases may retarget individual waypoints once each section's object
 * exists, but the interpolation contract here stays the same.
 */
const PATH: Waypoint[] = [
  { position: [0, 0, 6], lookAt: [0, 0, 0] }, // hero
  { position: [1.1, 0.35, 5.4], lookAt: [0.2, 0.05, 0] }, // about
  { position: [-1.3, 0.5, 5.6], lookAt: [-0.25, 0.1, 0] }, // skills
  { position: [1.0, -0.25, 5.7], lookAt: [0.15, -0.1, 0] }, // experience
  { position: [-1.0, 0.15, 5.0], lookAt: [-0.15, 0, 0] }, // projects
  { position: [0, 0, 6.6], lookAt: [0, 0, 0] }, // contact
];

const scratchPosition = new THREE.Vector3();
const scratchLookAt = new THREE.Vector3();

/** How many waypoints — and so how many DOM sections — the shared camera path covers. */
export const SCENE_SECTION_COUNT = PATH.length;

/**
 * Local 0–1 progress within one section-to-next-section span of the shared
 * camera path, e.g. `sceneSectionProgress(progress, 0)` is 0 at rest in Hero
 * and 1 once the camera has fully arrived at About. Lets each section-scene
 * derive its own scroll-driven transform from the same single `progress`
 * value `CameraRig` already uses, without re-deriving the path or hard-coding
 * a second copy of its waypoint count.
 */
export function sceneSectionProgress(progress: number, index: number): number {
  const span = PATH.length - 1;
  const t = THREE.MathUtils.clamp(progress, 0, 1) * span;
  return THREE.MathUtils.clamp(t - index, 0, 1);
}

/**
 * Drives the persistent camera from `progress` alone. Renders nothing; it
 * only calls `useFrame` on the shared camera instance every other scene
 * component in the canvas reads via `useThree()`.
 */
export function CameraRig({ progress, reducedMotion }: CameraRigProps) {
  const { camera } = useThree();
  const lookAt = useRef(new THREE.Vector3());

  useFrame((_state, delta) => {
    const span = PATH.length - 1;
    const t = THREE.MathUtils.clamp(progress, 0, 1) * span;
    const i = Math.min(Math.floor(t), span - 1);
    const local = t - i;

    const a = PATH[i] ?? PATH[0]!;
    const b = PATH[i + 1] ?? a;

    scratchPosition.set(
      THREE.MathUtils.lerp(a.position[0], b.position[0], local),
      THREE.MathUtils.lerp(a.position[1], b.position[1], local),
      THREE.MathUtils.lerp(a.position[2], b.position[2], local),
    );
    scratchLookAt.set(
      THREE.MathUtils.lerp(a.lookAt[0], b.lookAt[0], local),
      THREE.MathUtils.lerp(a.lookAt[1], b.lookAt[1], local),
      THREE.MathUtils.lerp(a.lookAt[2], b.lookAt[2], local),
    );

    // Reduced motion still has to land in the right place — it just arrives
    // without the trailing damped follow, the same contract `springOrCut`
    // uses for DOM motion.
    const damp = reducedMotion ? 1 : 1 - Math.pow(0.001, delta);

    camera.position.lerp(scratchPosition, damp);
    lookAt.current.lerp(scratchLookAt, damp);
    camera.lookAt(lookAt.current);
  });

  return null;
}
