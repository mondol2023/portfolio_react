"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { buildDrifters, DRIFTER_COUNT, type DrifterSpec } from "@/lib/experience/scene-drifters";
import { contentSafeFraction } from "@/lib/experience/scene-layout";
import {
  SCENE_SMOOTHING,
  clampDelta,
  damp,
  dampFactor,
  springStep,
  type SpringState,
} from "@/lib/experience/scene-motion";
import type { ScenePalette } from "@/lib/experience/scene-palette";
import { scenePointer, setSceneDragging } from "@/lib/experience/scene-pointer";
import {
  dragPlaneThroughPoint,
  dragPointOnPlane,
  pickNearest,
  registerInteractive,
} from "@/lib/experience/scene-raycaster";
import { signature } from "@/lib/experience/scene-signature";

import { roundedSlabGeometry } from "./geometry";

interface DriftersProps {
  palette: ScenePalette;
  budget: SceneBudget;
  reducedMotion: boolean;
  /** Pointer in NDC, shared with the rig — the drag reads it, it never adds a listener. */
  pointer: { current: { x: number; y: number } };
  /** False on a coarse pointer: a finger has no grab, and mobile must not fake one. */
  grabEnabled: boolean;
}

/** Furthest a drag may carry one, as a multiple of the viewport half-extent. */
const DRAG_LIMIT_X = 1.25;
const DRAG_LIMIT_Y = 1.15;
/** What a drifter dims to over the reading column. Never zero — it passes behind, it does not blink. */
const COLUMN_FLOOR = 0.12;

const scratchWorld = new THREE.Vector3();
const scratchPlanePoint = new THREE.Vector3();

interface DrifterRuntime {
  /** Displacement from the lane position, sprung in three axes. */
  offsetX: SpringState;
  offsetY: SpringState;
  offsetZ: SpringState;
  /** 0–1 grab reaction: swells and warms while held. */
  hold: number;
  /** This frame's lane position, in the group's own space. */
  homeX: number;
  homeY: number;
}

function newRuntime(): DrifterRuntime {
  return {
    offsetX: { value: 0, velocity: 0 },
    offsetY: { value: 0, velocity: 0 },
    offsetZ: { value: 0, velocity: 0 },
    hold: 0,
    homeX: 0,
    homeY: 0,
  };
}

function buildGeometry(spec: DrifterSpec, segments: number): THREE.BufferGeometry {
  const radial = Math.max(6, Math.round(segments / 3));
  const tube = Math.max(5, Math.round(segments / 8));

  switch (spec.form) {
    case "ring":
      return new THREE.TorusGeometry(0.72, 0.15, tube, radial);
    case "shard":
      return new THREE.OctahedronGeometry(1, 0);
    case "slab":
      return roundedSlabGeometry(1.5, 0.95, 0.22, 0.16, Math.max(1, Math.round(segments / 24)));
    case "rod":
      return new THREE.CapsuleGeometry(0.2, 1.25, Math.max(2, tube - 2), radial);
    case "prism":
      return new THREE.CylinderGeometry(0.6, 0.6, 1.15, 3);
  }
}

/**
 * Small objects crossing the whole frame and back on long lanes, which a mouse
 * can pick up and throw. Plan §11, Phase 20.
 *
 * The group copies the camera's transform each frame, so a child's local
 * position is an exact screen fraction whatever the rig does to the lens. The
 * grab is a real ray against the registered meshes (S7, §6.2); the follow
 * tracks a plane through the grab point (§6.4), not camera-local trig.
 */
export function Drifters({ palette, budget, reducedMotion, pointer, grabEnabled }: DriftersProps) {
  const specs = useMemo(() => buildDrifters(DRIFTER_COUNT[budget.tier]), [budget.tier]);

  // One geometry and one material per drifter, disposed by hand — `dispose={null}`
  // on the meshes keeps R3F out of a lifetime this component owns.
  const geometries = useMemo(
    () => specs.map((spec) => buildGeometry(spec, budget.segments)),
    [specs, budget.segments],
  );

  const materials = useMemo(
    () =>
      specs.map(
        (spec) =>
          new THREE.MeshStandardMaterial({
            color: spec.metal ? palette.fill : palette.surface,
            emissive: palette.accent,
            emissiveIntensity: 0.04,
            metalness: spec.metal ? 0.78 : 0.14,
            roughness: spec.metal ? 0.32 : 0.62,
            transparent: true,
            opacity: 0,
          }),
      ),
    [specs, palette.accent, palette.fill, palette.surface],
  );

  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  // Synced inside `useFrame`, not during render: a ref written in the render
  // pass is the thing `react-hooks/refs` is there to catch.
  const runtime = useRef<DrifterRuntime[]>([]);

  /** Index of the drifter currently in hand, or -1. */
  const grabbed = useRef(-1);
  const lastStamp = useRef(scenePointer.pressStamp);
  /** The drag surface (§6.4.2), rebuilt at the moment of the grab. */
  const dragPlane = useRef(new THREE.Plane());
  /** One unregister per mesh slot, kept in step with `meshRefs`. */
  const unregisterRefs = useRef<(() => void)[]>([]);
  /** Own clock, so the signature moment's stillness beat can stop the lanes dead. */
  const time = useRef(0);
  const primed = useRef(false);

  // A drag left mid-flight by an unmount would otherwise strand the page in
  // the grabbing cursor.
  useEffect(() => () => setSceneDragging(false), []);

  // Every registered mesh must unregister when the whole group unmounts, not
  // only when an individual ref callback fires with `null`.
  useEffect(() => () => unregisterRefs.current.forEach((unregister) => unregister()), []);

  useFrame((state, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;

    const { camera, size } = state;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    if (runtime.current.length !== specs.length) runtime.current = specs.map(newRuntime);

    const delta = clampDelta(rawDelta);
    const dim = 1 - signature.dim;
    time.current += delta * (1 - signature.hold);

    // Follow the lens, a beat late. Snapped on the first frame and under
    // reduced motion, neither of which has a continuous loop to catch up in.
    if (!primed.current || reducedMotion) {
      primed.current = true;
      group.position.copy(camera.position);
      group.quaternion.copy(camera.quaternion);
    } else {
      const follow = dampFactor(SCENE_SMOOTHING.drift, delta);
      group.position.lerp(camera.position, follow);
      group.quaternion.slerp(camera.quaternion, follow);
    }

    const halfAtUnit = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    const safeFrac = contentSafeFraction(size.width);
    const dragging = grabEnabled && !reducedMotion;

    // Lane positions first: the grab test picks from where things actually are.
    for (let index = 0; index < specs.length; index += 1) {
      const spec = specs[index];
      const item = runtime.current[index];
      if (!spec || !item) continue;

      const halfH = halfAtUnit * spec.depth;
      const halfW = halfH * camera.aspect;
      // Sine, not a sawtooth: the turn at each end of the lane decelerates and
      // accelerates on its own, which is the no-linear-motion rule for free.
      const travel = Math.sin((time.current / spec.period + spec.phase) * Math.PI * 2);
      item.homeX = travel * spec.spanX * halfW;
      item.homeY =
        spec.laneY * halfH +
        Math.sin((time.current / spec.bobPeriod + spec.phase) * Math.PI * 2) * spec.bobFrac * halfH;
    }

    if (dragging && (scenePointer.pressed || grabbed.current >= 0)) {
      camera.updateMatrixWorld();
      group.updateMatrixWorld();
    }

    // A new press claims the nearest drifter under the ray, or nothing.
    if (dragging && scenePointer.pressStamp !== lastStamp.current) {
      lastStamp.current = scenePointer.pressStamp;
      grabbed.current = -1;

      if (scenePointer.grabAllowed) {
        const hit = pickNearest(camera, pointer.current);
        const index = hit ? meshRefs.current.indexOf(hit.object as THREE.Mesh) : -1;

        if (index !== -1 && hit) {
          grabbed.current = index;
          dragPlaneThroughPoint(camera, hit.point, dragPlane.current);
        }
      }

      setSceneDragging(grabbed.current >= 0);
    }

    // Released: the return spring below takes over.
    if (grabbed.current >= 0 && (!scenePointer.pressed || !dragging)) {
      grabbed.current = -1;
      setSceneDragging(false);
    }

    for (let index = 0; index < specs.length; index += 1) {
      const spec = specs[index];
      const item = runtime.current[index];
      const mesh = meshRefs.current[index];
      const material = mesh?.material;
      if (!spec || !item || !mesh || !(material instanceof THREE.MeshStandardMaterial)) continue;

      const halfH = halfAtUnit * spec.depth;
      const halfW = halfH * camera.aspect;
      const held = grabbed.current === index;

      if (held) {
        // Ray → drag plane → world point (§6.4.3), then back into the
        // group's slightly lagging space.
        const worldPoint = dragPointOnPlane(camera, pointer.current, dragPlane.current, scratchPlanePoint);

        if (worldPoint) {
          group.worldToLocal(scratchWorld.copy(worldPoint));

          const targetX = THREE.MathUtils.clamp(
            scratchWorld.x,
            -halfW * DRAG_LIMIT_X,
            halfW * DRAG_LIMIT_X,
          );
          const targetY = THREE.MathUtils.clamp(
            scratchWorld.y,
            -halfH * DRAG_LIMIT_Y,
            halfH * DRAG_LIMIT_Y,
          );

          // `snappy` for the follow: it arrives just behind the hand, which is
          // what makes it feel carried rather than glued to the cursor.
          springStep(item.offsetX, targetX - item.homeX, "snappy", delta);
          springStep(item.offsetY, targetY - item.homeY, "snappy", delta);
        }
        springStep(item.offsetZ, 0, "snappy", delta);
      } else {
        // `settle` for the return: whatever velocity the throw left is spent
        // over about a second, so a flick arcs back to its lane rather than
        // snapping to it.
        springStep(item.offsetX, 0, "settle", delta);
        springStep(item.offsetY, 0, "settle", delta);
        springStep(item.offsetZ, 0, "settle", delta);
      }

      item.hold = damp(item.hold, held ? 1 : 0, SCENE_SMOOTHING.tight, delta);

      mesh.position.set(
        item.homeX + item.offsetX.value,
        item.homeY + item.offsetY.value,
        -spec.depth + item.offsetZ.value,
      );

      // Held objects tumble, so the two forms that never rotate still answer
      // the grab. Otherwise this is the one constant ambient rotation allowed.
      const spinUp = 1 + item.hold * 6;
      mesh.rotation.x += (spec.spin.x + item.hold * 0.18) * delta * spinUp;
      mesh.rotation.y += (spec.spin.y + item.hold * 0.26) * delta * spinUp;
      mesh.rotation.z += spec.spin.z * delta * spinUp;

      mesh.scale.setScalar(spec.sizeFrac * halfH * (1 + item.hold * 0.22));

      // The reading column's own shadow: full presence out in the gutter,
      // `COLUMN_FLOOR` once a drifter is over the text. It crosses behind the
      // column rather than stopping at it, so the lane stays one travel.
      const xFrac = Math.abs(mesh.position.x) / Math.max(halfW, 0.001);
      const clear = THREE.MathUtils.smoothstep(xFrac, safeFrac * 0.55, safeFrac + 0.06);
      const presence = THREE.MathUtils.lerp(COLUMN_FLOOR, 1, clear);

      material.opacity = (palette.dark ? 0.66 : 0.52) * presence * dim;
      material.emissiveIntensity = 0.04 + item.hold * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {specs.map((spec, index) => (
        <mesh
          key={`${spec.form}-${index}`}
          ref={(instance) => {
            meshRefs.current[index] = instance;
            unregisterRefs.current[index]?.();
            unregisterRefs.current[index] = instance ? registerInteractive(instance) : () => {};
          }}
          geometry={geometries[index]}
          material={materials[index]}
          dispose={null}
        />
      ))}
    </group>
  );
}
