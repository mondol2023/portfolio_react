"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { contentSafeFraction, gutterPixels } from "@/lib/experience/scene-layout";
import { clampDelta, damp, easeOutCubic, SCENE_SMOOTHING, springStep, stagger, type SpringState } from "@/lib/experience/scene-motion";
import type { ScenePalette } from "@/lib/experience/scene-palette";
import { scenePointer, setSceneDragging } from "@/lib/experience/scene-pointer";
import { pickNearest, registerInteractive } from "@/lib/experience/scene-raycaster";
import { sceneScroll } from "@/lib/experience/scene-scroll";
import type { Project } from "@/lib/types/content";

import { sceneSectionEnvelope } from "../../scene/camera-rig";
import { roundedSlabGeometry } from "../../scene/geometry";
import { useSceneKTX2 } from "../../scene/loaders";
import { buildSlabs, SLAB_DEPTH, SLAB_HEIGHT, SLAB_WIDTH, WALL_LIMIT } from "./layout";

export interface MonolithsProps {
  projects: Project[];
  palette: ScenePalette;
  budget: SceneBudget;
  reducedMotion: boolean;
  pointer: { current: { x: number; y: number } };
  /** This section's waypoint index: `entry` raises the monoliths, `exit` lowers them again. */
  sectionIndex: number;
}

/** Gutter thresholds a monolith needs to stand in — the same screen real estate `corridor.tsx`'s walls use. */
const WALL_MIN_GUTTER = 70;
const WALL_FULL_GUTTER = 150;
const PANEL_MARGIN = 0.2;
const PANEL_FRAC_MIN = 0.9;
const PANEL_FRAC_MAX = 1.12;
const MIN_DEPTH = 1.5;

/** A flush monolith still turns partway toward the reader, before any drag. */
const BASE_TOE_IN = THREE.MathUtils.degToRad(18);

/** Radians of spin per NDC unit of horizontal drag — a half-screen drag clears 90°. */
const DRAG_SENSITIVITY = Math.PI * 0.9;
/** A drag never spins a monolith further than this — always short of a full turn, always enough to reach the reverse face. */
const DRAG_CLAMP = Math.PI * 0.95;
/** Past this on release, the settle target is the reverse face instead of flush. */
const FLIP_THRESHOLD = Math.PI / 2;

interface MonolithRuntime {
  /** Additional yaw from the drag, on top of `BASE_TOE_IN` — spring-driven so a release carries the drag's momentum. */
  angle: SpringState;
  /** 0–1 grab reaction, eases the held glow. */
  hold: number;
}

function newRuntime(): MonolithRuntime {
  return { angle: { value: 0, velocity: 0 }, hold: 0 };
}

/**
 * Observatory's Projects identity (§4.2): the corridor's wall-mounted slabs
 * become free-standing monoliths, lit only by `lighting.tsx`'s moving key —
 * no local gallery light of its own — and draggable: press and drag
 * horizontally spins one about its own Y axis, carrying the drag's velocity
 * into the release. It settles flush unless the drag passed 90°, in which
 * case it settles showing its reverse face (read through a stronger emissive
 * glow rather than new 3D typography — the DOM still owns type, S1 rule 1).
 *
 * Reuses `buildSlabs`' placement data (side, depth, lift, colour) exactly as
 * `corridor.tsx` does — S3/S17's "read the same layout, never re-derive it" —
 * but positions each slab statically in the gutter rather than opening a wall,
 * since a monolith does not hinge.
 */
export function Monoliths({ projects, palette, budget, reducedMotion, pointer, sectionIndex }: MonolithsProps) {
  const ranked = useMemo(() => [...projects].sort((a, b) => a.order - b.order), [projects]);
  const slabs = useMemo(() => buildSlabs(ranked, palette, WALL_LIMIT[budget.tier]), [ranked, palette, budget.tier]);

  // Brushed-metal ORM (AO/roughness/metalness packed) + normal map, generated
  // in Phase H (§8) — this is their first consumer. `aoMap` is deliberately
  // left unset: it needs a second UV channel this slab geometry doesn't carry,
  // so assigning it would silently do nothing rather than add anything.
  const orm = useSceneKTX2("/textures/brushed-orm.ktx2");
  const normalMap = useSceneKTX2("/textures/brushed-normal.ktx2");
  useEffect(() => {
    // Non-colour data (S5) — must be declared explicitly, never inherit the
    // loader's default sRGB assumption.
    orm.colorSpace = THREE.NoColorSpace;
    orm.needsUpdate = true;
    normalMap.colorSpace = THREE.NoColorSpace;
    normalMap.needsUpdate = true;
  }, [orm, normalMap]);

  const geometry = useMemo(() => {
    const bevel = Math.max(1, Math.round(budget.segments / 24));
    return {
      slab: roundedSlabGeometry(SLAB_WIDTH, SLAB_HEIGHT, SLAB_DEPTH, 0.07, bevel),
      edge: new THREE.BoxGeometry(0.05, SLAB_HEIGHT * 0.92, 0.11),
    };
  }, [budget.segments]);

  useEffect(() => {
    return () => {
      geometry.slab.dispose();
      geometry.edge.dispose();
    };
  }, [geometry]);

  const rootRef = useRef<THREE.Group>(null);
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const faceMaterials = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const edgeMaterials = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const unregisterRefs = useRef<(() => void)[]>([]);

  // Memoised, not a resized ref: its elements are still mutated imperatively
  // from `useFrame` below (spring integration has to live somewhere), but the
  // array itself only needs to change shape when `slabs` does.
  const runtime = useMemo(() => slabs.map(newRuntime), [slabs]);
  /** Index of the monolith currently in hand, or -1. */
  const grabbed = useRef(-1);
  const lastPointerX = useRef(0);
  const lastStamp = useRef(scenePointer.pressStamp);

  useEffect(() => () => setSceneDragging(false), []);
  useEffect(() => () => unregisterRefs.current.forEach((unregister) => unregister()), []);

  useFrame((state, rawDelta) => {
    const root = rootRef.current;
    const camera = state.camera;
    if (!root || !(camera instanceof THREE.PerspectiveCamera)) return;
    const delta = clampDelta(rawDelta);

    const { entry: entryProgress, exit: exitProgress } = sceneSectionEnvelope(sceneScroll.progress, sectionIndex);
    const opening = reducedMotion ? 1 : THREE.MathUtils.smoothstep(entryProgress, 0, 1);
    const presence = 1 - THREE.MathUtils.smoothstep(exitProgress, 0, 1);

    root.visible = presence > 0.01;
    if (!root.visible) return;

    const safeFrac = contentSafeFraction(state.size.width);
    const gutterPx = gutterPixels(state.size.width);
    const allowance = THREE.MathUtils.smoothstep(gutterPx, WALL_MIN_GUTTER, WALL_FULL_GUTTER);
    const wallsOn = allowance > 0.05;

    const halfAtUnit = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    const panelFrac = THREE.MathUtils.clamp(safeFrac + PANEL_MARGIN, PANEL_FRAC_MIN, PANEL_FRAC_MAX);

    const dragging = !reducedMotion && wallsOn;

    // A new press claims the nearest registered monolith under the ray.
    // `scenePointer` is only ever live when a fine pointer exists (gated in
    // `scene-canvas.tsx`), so this is a correct no-op on touch without a
    // separate check here.
    if (dragging && scenePointer.pressStamp !== lastStamp.current) {
      lastStamp.current = scenePointer.pressStamp;
      grabbed.current = -1;

      if (scenePointer.grabAllowed) {
        const hit = pickNearest(camera, pointer.current);
        const index = hit ? meshRefs.current.indexOf(hit.object as THREE.Mesh) : -1;
        if (index !== -1) {
          grabbed.current = index;
          lastPointerX.current = pointer.current.x;
        }
      }

      setSceneDragging(grabbed.current >= 0);
    }

    if (grabbed.current >= 0 && (!scenePointer.pressed || !dragging)) {
      grabbed.current = -1;
      setSceneDragging(false);
    }

    slabs.forEach((slab, index) => {
      const group = groupRefs.current[index];
      const item = runtime[index];
      if (!group || !item) return;

      group.visible = wallsOn;
      if (!wallsOn) return;

      // Near-to-far reveal on the way in, same order on the way out — the
      // wave `corridor.tsx` uses for its wall-open, repurposed here as a
      // scale-in since a monolith doesn't hinge.
      const wave = reducedMotion ? 1 : easeOutCubic(stagger(opening, index, slabs.length, 0.5));
      const shut = reducedMotion ? 0 : easeOutCubic(stagger(1 - presence, index, slabs.length, 0.5));
      const emergence = THREE.MathUtils.clamp(wave * (1 - shut), 0, 1) * allowance;

      const depth = Math.max(MIN_DEPTH, camera.position.z - (root.position.z + slab.z));
      const halfH = halfAtUnit * depth;
      const halfW = halfH * camera.aspect;
      group.position.set(slab.side * (panelFrac * halfW), -slab.side * slab.lift * halfH, slab.z);
      group.scale.setScalar(slab.scale * emergence);

      const held = grabbed.current === index;
      if (held) {
        // Direct 1:1 follow while held — a rotation drag reads as "attached
        // to the hand," not sprung, exactly like `drifters.tsx`'s position
        // drag. Velocity is derived from the frame's own delta so the release
        // below inherits real momentum rather than starting from zero.
        const deltaX = pointer.current.x - lastPointerX.current;
        lastPointerX.current = pointer.current.x;
        const next = THREE.MathUtils.clamp(item.angle.value + deltaX * DRAG_SENSITIVITY, -DRAG_CLAMP, DRAG_CLAMP);
        item.angle.velocity = delta > 0 ? (next - item.angle.value) / delta : 0;
        item.angle.value = next;
      } else {
        // Released: settle flush unless the drag passed 90°, in which case
        // the target is the reverse face — `springStep` carries whatever
        // velocity the drag left, so a flick keeps travelling into the turn.
        const target = Math.abs(item.angle.value) > FLIP_THRESHOLD ? Math.sign(item.angle.value) * Math.PI : 0;
        springStep(item.angle, target, "settle", delta);
      }

      item.hold = damp(item.hold, held ? 1 : 0, SCENE_SMOOTHING.tight, delta);

      const baseYaw = -slab.side * BASE_TOE_IN;
      group.rotation.y = baseYaw + item.angle.value;

      // How far into "reverse" this monolith currently reads — a flip is a
      // different surface, signalled by a stronger glow rather than a colour
      // swap, so it stays legible at every intermediate angle of the turn.
      const flipAmount = THREE.MathUtils.clamp(Math.abs(item.angle.value) / FLIP_THRESHOLD, 0, 1);

      const face = faceMaterials.current[index];
      if (face) {
        face.opacity = emergence;
        face.emissiveIntensity = 0.05 + item.hold * 0.4 + flipAmount * 0.6;
      }
      const edge = edgeMaterials.current[index];
      if (edge) {
        edge.opacity = emergence;
        edge.emissiveIntensity = 0.5 + item.hold * 1.2 + flipAmount * 0.8;
      }
    });
  });

  if (slabs.length === 0) return null;

  return (
    <group ref={rootRef}>
      {slabs.map((slab, index) => (
        <group
          key={slab.project.id}
          ref={(el) => {
            groupRefs.current[index] = el;
          }}
        >
          {/* Double-sided: the reverse face read is the same mesh turned
              around, not a second surface — cheaper, and there is nothing on
              the back that needs its own geometry (S1 rule 1: type stays in
              the DOM). */}
          <mesh
            ref={(el) => {
              meshRefs.current[index] = el;
              unregisterRefs.current[index]?.();
              unregisterRefs.current[index] = el ? registerInteractive(el) : () => {};
            }}
            geometry={geometry.slab}
            dispose={null}
            castShadow={budget.shadows}
            receiveShadow={budget.shadows}
          >
            <meshStandardMaterial
              ref={(el) => {
                faceMaterials.current[index] = el;
              }}
              color={slab.color}
              emissive={palette.accent}
              emissiveIntensity={0.05}
              metalness={0.9}
              roughness={0.15}
              roughnessMap={orm}
              metalnessMap={orm}
              normalMap={normalMap}
              side={THREE.DoubleSide}
              transparent
              opacity={0}
            />
          </mesh>

          {/* The one accent line every monolith carries, same convention as
              `corridor.tsx`'s panel edge. */}
          <mesh geometry={geometry.edge} position={[slab.side * (SLAB_WIDTH / 2 - 0.02), 0, 0.03]} dispose={null}>
            <meshStandardMaterial
              ref={(el) => {
                edgeMaterials.current[index] = el;
              }}
              color={palette.accent}
              emissive={palette.accent}
              emissiveIntensity={0.5}
              metalness={0.3}
              roughness={0.35}
              transparent
              opacity={0}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
