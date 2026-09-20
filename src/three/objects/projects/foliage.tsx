"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { contentSafeFraction, gutterPixels } from "@/lib/experience/scene-layout";
import {
  clampDelta,
  damp,
  easeOutCubic,
  type EntranceId,
  entranceStagger,
  SCENE_SMOOTHING,
  springStep,
  stagger,
  type SpringState,
} from "@/lib/experience/scene-motion";
import type { ScenePalette } from "@/lib/experience/scene-palette";
import { scenePointer } from "@/lib/experience/scene-pointer";
import { createHoverPicker, registerInteractive } from "@/lib/experience/scene-raycaster";
import { sceneScroll } from "@/lib/experience/scene-scroll";
import type { Project } from "@/lib/types/content";

import { sceneSectionEnvelope } from "../../scene/camera-rig";
import { useSceneKTX2 } from "../../scene/loaders";
import { hoveredSlabIndex } from "./hovered";
import { buildSlabs, WALL_LIMIT } from "./layout";

export interface FoliageProps {
  projects: Project[];
  palette: ScenePalette;
  budget: SceneBudget;
  reducedMotion: boolean;
  pointer: { current: { x: number; y: number } };
  /** This section's waypoint index: `entry` unfurls the leaves, `exit` folds them back. */
  sectionIndex: number;
  /** `scenery.entrance` — the world's arrival language, applied to this section's entry ramp. */
  entrance: EntranceId;
}

const WALL_MIN_GUTTER = 70;
const WALL_FULL_GUTTER = 150;
const PANEL_MARGIN = 0.2;
const PANEL_FRAC_MIN = 0.9;
const PANEL_FRAC_MAX = 1.12;
const MIN_DEPTH = 1.5;

const LEAF_LENGTH = 0.92;
const LEAF_WIDTH = 0.66;
const LEAF_DEPTH = 0.016;

/** Rest yaw is edge-on to the wall (reuses `buildSlabs.closed`); a leaf only turns further toward camera-facing when the dot product below says it's worth it. */
/** How much sway energy a full page of scrolling is worth. */
const SWAY_GAIN = 26;
/** Peak lean, radians — ~3 degrees at a hard flick, nothing at rest. */
const SWAY_AMPLITUDE = 0.05;
const FACE_GATE_LOW = -0.1;
const FACE_GATE_HIGH = 0.55;

/** Hovered: the leaf lifts and comes a little way round. */
const HOVER_LIFT = 0.06;
const HOVER_SCALE = 0.08;
/** Pressed: it yields — smaller, fully turned, brighter. Unmistakably not the hover. */
const PRESS_GIVE = 0.09;
const PRESS_GLOW = 0.35;

interface LeafRuntime {
  /** 0-1 camera-facing turn, eased rather than snapped so the gate reads as a lean, not a flip. */
  turn: SpringState;
  /** 0-1 hover reaction. */
  hold: number;
  /** 0-1 press reaction, sprung so the release unwinds rather than cuts. */
  press: SpringState;
  swayPhase: number;
}

function newRuntime(index: number): LeafRuntime {
  return { turn: { value: 0, velocity: 0 }, hold: 0, press: { value: 0, velocity: 0 }, swayPhase: index * 2.4 };
}

/**
 * An almond leaf outline extruded to a slight thickness — one template
 * geometry every panel shares, rotated per-instance in the same way
 * `monoliths.tsx` shares one slab geometry. The base (stem attach point) is
 * shape-local (0, -length/2, 0); the tip reaches to (0, length/2, 0).
 */
function buildLeafGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const half = LEAF_WIDTH / 2;
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(half, LEAF_LENGTH * 0.4, 0, LEAF_LENGTH);
  shape.quadraticCurveTo(-half, LEAF_LENGTH * 0.4, 0, 0);

  const geometry = new THREE.ExtrudeGeometry(shape, { depth: LEAF_DEPTH, bevelEnabled: false, curveSegments: 12 });
  geometry.translate(0, -LEAF_LENGTH / 2, -LEAF_DEPTH / 2);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * The garden's stem system (§3): one static, merged `TubeGeometry` — a
 * central spine receding into depth plus a short twig toward each leaf's
 * side — matching `growth.tsx`'s `buildStemGeometry` convention (deterministic,
 * one draw call, disposed with the field). Twigs reach toward each project's
 * general side/depth rather than tracking its exact screen-anchored position
 * every frame — the spine is a background compositional cue, not a rig.
 */
function buildStemGeometry(slabs: ReturnType<typeof buildSlabs>): THREE.BufferGeometry {
  const nearZ = slabs[0]?.z ?? 0;
  const farZ = slabs[slabs.length - 1]?.z ?? nearZ - 1;
  const spine = new THREE.CatmullRomCurve3(
    [new THREE.Vector3(0, 0.1, nearZ + 0.6), new THREE.Vector3(0.04, -0.05, (nearZ + farZ) / 2), new THREE.Vector3(-0.03, 0.05, farZ - 0.6)],
    false,
    "catmullrom",
    0.3,
  );
  const pieces = [new THREE.TubeGeometry(spine, 20, 0.02, 5, false).toNonIndexed()];

  slabs.forEach((slab) => {
    const from = spine.getPoint(THREE.MathUtils.clamp((nearZ - slab.z) / Math.max(0.001, nearZ - farZ), 0, 1));
    const to = new THREE.Vector3(slab.side * 0.5, from.y - 0.1, slab.z);
    const twig = new THREE.CatmullRomCurve3([from, new THREE.Vector3((from.x + to.x) / 2, from.y - 0.04, (from.z + to.z) / 2), to]);
    pieces.push(new THREE.TubeGeometry(twig, 8, 0.011, 4, false).toNonIndexed());
  });

  const merged = mergeGeometries(pieces, false);
  pieces.forEach((piece) => piece.dispose());
  return merged ?? new THREE.BufferGeometry();
}

/**
 * Garden's Projects identity (§4.3): the corridor's wall panels become
 * leaves on a shared stem, turning to face the reader rather than hinging
 * open, and lifting on hover instead of dragging. Reuses `buildSlabs`'
 * placement data exactly as `monoliths.tsx` does (S3/S17) — side, depth,
 * lift, scale and colour all come from the same layout every wall variant
 * reads.
 */
export function Foliage({
  projects,
  palette,
  budget,
  reducedMotion,
  pointer,
  sectionIndex,
  entrance,
}: FoliageProps) {
  const ranked = useMemo(() => [...projects].sort((a, b) => a.order - b.order), [projects]);
  const slabs = useMemo(() => buildSlabs(ranked, palette, WALL_LIMIT[budget.tier]), [ranked, palette, budget.tier]);

  // Leaf colour/normal (Phase J, §8) — a genuine colour texture (BT709/SRGB
  // container) plus a data normal map (S5: colour space set explicitly on
  // load, never left to the loader's default).
  const colorMap = useSceneKTX2("/textures/leaf-color.ktx2");
  const normalMap = useSceneKTX2("/textures/leaf-normal.ktx2");
  useEffect(() => {
    colorMap.colorSpace = THREE.SRGBColorSpace;
    colorMap.needsUpdate = true;
    normalMap.colorSpace = THREE.NoColorSpace;
    normalMap.needsUpdate = true;
  }, [colorMap, normalMap]);

  const leafGeometry = useMemo(() => buildLeafGeometry(), []);
  const stemGeometry = useMemo(() => buildStemGeometry(slabs), [slabs]);
  useEffect(() => {
    return () => {
      leafGeometry.dispose();
      stemGeometry.dispose();
    };
  }, [leafGeometry, stemGeometry]);

  const rootRef = useRef<THREE.Group>(null);
  /** Scroll-driven sway: energy in from movement, damped out to rest. */
  const swayState = useRef({ energy: 0, last: 0 });
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const leafMaterials = useRef<(THREE.MeshPhysicalMaterial | null)[]>([]);
  const unregisterRefs = useRef<(() => void)[]>([]);

  const runtime = useMemo(() => slabs.map((_slab, index) => newRuntime(index)), [slabs]);
  const pickHover = useMemo(() => createHoverPicker(), []);

  useEffect(() => () => unregisterRefs.current.forEach((unregister) => unregister()), []);

  const scratchWorld = useMemo(() => new THREE.Vector3(), []);
  const scratchToCamera = useMemo(() => new THREE.Vector3(), []);
  const scratchForward = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, rawDelta) => {
    const root = rootRef.current;
    const camera = state.camera;
    if (!root || !(camera instanceof THREE.PerspectiveCamera)) return;
    const delta = clampDelta(rawDelta);

    const { entry: entryProgress, exit: exitProgress } = sceneSectionEnvelope(sceneScroll.progress, sectionIndex);
    // Raw, not smoothstepped: the world's own entrance curve is the only
    // shaping applied to it now (Part 4).
    const opening = reducedMotion ? 1 : entryProgress;
    const presence = 1 - THREE.MathUtils.smoothstep(exitProgress, 0, 1);

    root.visible = presence > 0.01;
    if (!root.visible) return;

    const safeFrac = contentSafeFraction(state.size.width);
    const gutterPx = gutterPixels(state.size.width);
    const allowance = THREE.MathUtils.smoothstep(gutterPx, WALL_MIN_GUTTER, WALL_FULL_GUTTER);
    const wallsOn = allowance > 0.05;

    const halfAtUnit = Math.tan(THREE.MathUtils.degToRad(camera.fov) * 0.5);
    const panelFrac = THREE.MathUtils.clamp(safeFrac + PANEL_MARGIN, PANEL_FRAC_MIN, PANEL_FRAC_MAX);

    // Garden's wall is disturbed by the reader and settles back, rather than
    // bobbing on a clock of its own: scroll movement adds energy, `damp`
    // takes it away. At rest the leaves are still — which is what "settling,
    // not idle-game bobbing" means, and what `scenery.ts` already claims for
    // this world ("nothing moves on its own clock, only in response to
    // scroll"). Before Phase L that claim was false: the sway ran off
    // `sceneTime.elapsed` and never stopped.
    const scrolled = sceneScroll.progress - swayState.current.last;
    swayState.current.last = sceneScroll.progress;
    swayState.current.energy = damp(
      THREE.MathUtils.clamp(swayState.current.energy + scrolled * SWAY_GAIN, -1, 1),
      0,
      SCENE_SMOOTHING.glide,
      delta,
    );
    const swayEnergy = reducedMotion ? 0 : swayState.current.energy;

    const interactive = !reducedMotion && wallsOn && presence > 0.05;
    let hoveredIndex = -1;
    if (interactive) {
      // The throttled picker, not a raw ray: this is the page's one continuous
      // raycast, so §6.2's frame and scroll gates apply to it.
      hoveredIndex = hoveredSlabIndex(slabs, () => {
        const hit = pickHover(camera, pointer.current);
        return hit ? meshRefs.current.indexOf(hit.object as THREE.Mesh) : -1;
      });
    }

    slabs.forEach((slab, index) => {
      const group = groupRefs.current[index];
      const item = runtime[index];
      if (!group || !item) return;

      group.visible = wallsOn;
      if (!wallsOn) return;

      const wave = reducedMotion ? 1 : entranceStagger(entrance, opening, index, slabs.length);
      const shut = reducedMotion ? 0 : easeOutCubic(stagger(1 - presence, index, slabs.length, 0.5));
      const emergence = THREE.MathUtils.clamp(wave * (1 - shut), 0, 1) * allowance;

      const depth = Math.max(MIN_DEPTH, camera.position.z - (root.position.z + slab.z));
      const halfH = halfAtUnit * depth;
      const halfW = halfH * camera.aspect;
      group.position.set(slab.side * (panelFrac * halfW), -slab.side * slab.lift * halfH, slab.z);

      const hovered = hoveredIndex === index;
      item.hold = damp(item.hold, hovered ? 1 : 0, SCENE_SMOOTHING.tight, delta);
      const hold = item.hold;
      // Garden answers a press by giving, not by opening: the leaf yields under
      // the hand and unwinds on `settle`.
      const pressing = hovered && scenePointer.pressed && scenePointer.grabAllowed;
      const press = springStep(item.press, pressing ? 1 : 0, "settle", delta);
      // Lift + a touch of extra scale on hover, from whichever source spoke:
      // the hovered card if there is one, otherwise the ray (`hovered.ts`).
      // Until Phase L Part 6 only the ray existed, because `hoveredProjectId`
      // had no DOM publisher.
      group.position.y += hold * HOVER_LIFT;
      group.scale.setScalar(slab.scale * emergence * (1 + hold * HOVER_SCALE - press * PRESS_GIVE));

      // Phase-offset per leaf so the wall never moves in lockstep. The offset
      // is now a fixed signed gain rather than a running phase: each leaf
      // answers the same scroll energy by its own amount and direction.
      const sway = swayEnergy * Math.sin(item.swayPhase) * SWAY_AMPLITUDE * presence;

      // Dot-product-gated camera-facing turn: a leaf already angled toward
      // the reader barely moves; one turned away leans back before it does.
      scratchWorld.setFromMatrixPosition(group.matrixWorld);
      scratchToCamera.subVectors(camera.position, scratchWorld).setY(0).normalize();
      scratchForward.set(0, 0, 1).applyQuaternion(group.quaternion).setY(0).normalize();
      const dot = scratchForward.dot(scratchToCamera);
      const gate = THREE.MathUtils.smoothstep(dot, FACE_GATE_LOW, FACE_GATE_HIGH);
      const turnTarget = reducedMotion ? 1 : Math.max(gate, hold * 0.7, press);
      const turn = springStep(item.turn, turnTarget, "settle", delta);

      const restYaw = -slab.side * (Math.PI / 2 - 0.35);
      const faceYaw = Math.atan2(scratchToCamera.x, scratchToCamera.z) - Math.PI;
      group.rotation.y = THREE.MathUtils.lerp(restYaw, faceYaw, turn) + sway;

      const material = leafMaterials.current[index];
      if (material) {
        material.opacity = emergence;
        material.emissiveIntensity = 0.04 + hold * 0.3 + press * PRESS_GLOW;
      }
    });
  });

  if (slabs.length === 0) return null;

  return (
    <group ref={rootRef}>
      {/* The shared stem system — spine plus twigs, one merged draw call. */}
      <mesh geometry={stemGeometry} dispose={null}>
        <meshStandardMaterial color={palette.surface} roughness={0.85} metalness={0} />
      </mesh>

      {slabs.map((slab, index) => (
        <group
          key={slab.project.id}
          ref={(el) => {
            groupRefs.current[index] = el;
          }}
        >
          <mesh
            ref={(el) => {
              meshRefs.current[index] = el;
              unregisterRefs.current[index]?.();
              unregisterRefs.current[index] = el ? registerInteractive(el) : () => {};
            }}
            geometry={leafGeometry}
            dispose={null}
            castShadow={budget.shadows}
            receiveShadow={budget.shadows}
          >
            <meshPhysicalMaterial
              ref={(el) => {
                leafMaterials.current[index] = el;
              }}
              color={slab.color}
              map={colorMap}
              normalMap={normalMap}
              emissive={palette.accent}
              emissiveIntensity={0.04}
              roughness={0.55}
              metalness={0}
              transmission={0.35}
              thickness={0.04}
              ior={1.3}
              side={THREE.DoubleSide}
              transparent
              opacity={0}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
