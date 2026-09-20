"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { SceneBudget } from "@/lib/experience/device-tier";
import {
  clampDelta,
  damp,
  entranceEase,
  type EntranceId,
  entranceStagger,
  SCENE_SMOOTHING,
  springStep,
  type SpringState,
} from "@/lib/experience/scene-motion";
import { seededRandom } from "@/lib/experience/random";
import { sceneScroll } from "@/lib/experience/scene-scroll";
import { useSceneInteractionStore } from "@/lib/store/scene-interaction-store";
import { SKILL_CATEGORIES, type Skill } from "@/lib/types/content";

import { sceneSectionEnvelope } from "../../scene/camera-rig";
import { buildNodes, clamp01, NODE_RADIUS, type GalaxyNode } from "./layout";

export interface GrowthProps {
  skills: Skill[];
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  budget: SceneBudget;
  /** This section's waypoint index: `entry` scrubs the vine's `grow` clip and blooms it, `exit` fades the field out. */
  sectionIndex: number;
  /** `scenery.hueSpread` — how far category coding may tint a node off the scenery accent. */
  hueSpread: number;
  /** `scenery.entrance` — the world's arrival language, applied to this section's entry ramp. */
  entrance: EntranceId;
}

/** Matches `scripts/generate-garden-vine.mjs`'s `HEIGHT` — the trunk runs 0..2.6 in its own local space. */
const VINE_HEIGHT = 2.6;
/** Recentres the trunk (base-at-0) into the same vertical band `constellation.tsx`/`orrery.tsx` occupy. */
const VINE_Y_OFFSET = -1.15;

/** Radius of a branch's tube — thin enough to read as a stem, not a pipe. */
const STEM_RADIUS = 0.022;
const STEM_TUBULAR_SEGMENTS = 14;
const STEM_RADIAL_SEGMENTS = 5;

interface BranchSpec {
  curve: THREE.CatmullRomCurve3;
  attachHeight: number;
}

/**
 * One `CatmullRomCurve3` per skill category, leaving the trunk at increasing
 * heights and curving outward — the "vine/stem system" (§3 of the brief):
 * Frenet-oriented tube geometry that visually connects the composition
 * rather than free-floating decoration. Deterministic (`seededRandom`), so
 * the same five branches exist every render.
 */
function buildBranches(): BranchSpec[] {
  const random = seededRandom(53);
  const count = SKILL_CATEGORIES.length;

  return SKILL_CATEGORIES.map((_category, index) => {
    const t = (index + 0.5) / count;
    const attachHeight = 0.5 + t * 1.55;
    const angle = index * ((Math.PI * 2) / count) + (random() - 0.5) * 0.5;
    const reach = 0.95 + random() * 0.35;

    const start = new THREE.Vector3(0, attachHeight, 0);
    const mid = new THREE.Vector3(
      Math.cos(angle) * reach * 0.55,
      attachHeight + 0.22 + random() * 0.18,
      Math.sin(angle) * reach * 0.55,
    );
    const end = new THREE.Vector3(
      Math.cos(angle) * reach,
      attachHeight + 0.5 + random() * 0.2,
      Math.sin(angle) * reach,
    );

    return {
      curve: new THREE.CatmullRomCurve3([start, mid, end], false, "catmullrom", 0.35),
      attachHeight,
    };
  });
}

/** Every branch's tube, welded into one `BufferGeometry` — one draw call for the whole stem system, matching the merge convention `src/game/materials/geometry-registry.ts` already uses. */
function buildStemGeometry(branches: BranchSpec[]): THREE.BufferGeometry {
  const pieces = branches.map((branch) => {
    const tube = new THREE.TubeGeometry(branch.curve, STEM_TUBULAR_SEGMENTS, STEM_RADIUS, STEM_RADIAL_SEGMENTS, false);
    return tube.index ? tube.toNonIndexed() : tube;
  });
  const merged = mergeGeometries(pieces, false);
  pieces.forEach((piece) => piece.dispose());
  return merged ?? new THREE.BufferGeometry();
}

/** A skill's position along its category's branch, and the branch's own tangent at that point — read straight off the curve rather than re-derived. */
function budTransform(branch: BranchSpec, t: number, outPosition: THREE.Vector3, outTangent: THREE.Vector3): void {
  branch.curve.getPointAt(THREE.MathUtils.clamp(t, 0, 1), outPosition);
  branch.curve.getTangentAt(THREE.MathUtils.clamp(t, 0.001, 0.999), outTangent);
}

interface BudRuntime {
  node: GalaxyNode;
  branch: BranchSpec;
  /** 0–1 position along the branch's own arc length. */
  arcT: number;
  focus: SpringState;
}

function layoutBuds(nodes: GalaxyNode[], branches: BranchSpec[]): BudRuntime[] {
  const byCategory = new Map(branches.map((branch, index) => [SKILL_CATEGORIES[index], branch]));
  const countByCategory = new Map<string, number>();
  nodes.forEach((node) => countByCategory.set(node.skill.category, (countByCategory.get(node.skill.category) ?? 0) + 1));
  const slotByCategory = new Map<string, number>();

  return nodes.map((node) => {
    const branch = byCategory.get(node.skill.category) ?? branches[0]!;
    const slot = slotByCategory.get(node.skill.category) ?? 0;
    slotByCategory.set(node.skill.category, slot + 1);
    const count = countByCategory.get(node.skill.category) ?? 1;
    // 0.15..0.95: keeps buds off the trunk join and off the very tip.
    const arcT = count <= 1 ? 0.6 : 0.15 + (slot / (count - 1)) * 0.8;
    return { node, branch, arcT, focus: { value: 0, velocity: 0 } };
  });
}

const scratchPosition = new THREE.Vector3();
const scratchTangent = new THREE.Vector3();
const scratchMatrix = new THREE.Matrix4();
const scratchQuaternion = new THREE.Quaternion();
const scratchScale = new THREE.Vector3(1, 1, 1);
const scratchColor = new THREE.Color();
const UP = new THREE.Vector3(0, 1, 0);

const EMPTY_CLIPS: THREE.AnimationClip[] = [];

/**
 * Garden's Skills identity (§4.3): the settled graph becomes buds threaded
 * onto branches off one trunk. `VineField` renders the shared stem system,
 * the skill buds and — mid/high only, behind `Suspense` — the one skinned
 * mesh: the actual hero organic form, scrubbed by the same entry progress
 * that grows the buds in. One component rather than a loader wrapping a
 * renderer: the mesh has to mount as a *child* of the transformed group
 * below (not a sibling `useAnimations` never sees), which means the same
 * `rootRef` has to be both the animation root and the transform target.
 */
export function Growth({
  skills,
  tone,
  toneSoft,
  reducedMotion,
  budget,
  sectionIndex,
  hueSpread,
  entrance,
}: GrowthProps) {
  const shared = { skills, tone, toneSoft, reducedMotion, budget, sectionIndex, hueSpread, entrance } as const;

  if (budget.tier === "low") {
    // §11/Phase J: no skinned mesh at `low` — the static trunk below carries
    // the same silhouette without ever fetching `vine.glb`.
    return <VineField {...shared} gltf={null} />;
  }

  return (
    <Suspense fallback={<VineField {...shared} gltf={null} />}>
      <VineLoaded {...shared} />
    </Suspense>
  );
}

type LoadedGltf = ReturnType<typeof useGLTF<string>>;

/** Loads `vine.glb` through the shared Draco/meshopt-capable `useGLTF` (S8/S9). Suspends on first fetch — `Growth` above supplies the static fallback while it does. */
function VineLoaded(props: GrowthProps) {
  const gltf = useGLTF("/models/vine.glb");
  return <VineField {...props} gltf={gltf} />;
}

useGLTF.preload("/models/vine.glb");

/** How much sway energy a full page of scrolling is worth. */
const SWAY_GAIN = 26;
/** Peak lean, radians — small enough to read as ambient, zero at rest. */
const SWAY_AMPLITUDE = 0.015;

function VineField({
  skills,
  tone,
  toneSoft,
  reducedMotion,
  budget,
  sectionIndex,
  hueSpread,
  entrance,
  gltf,
}: GrowthProps & { gltf: LoadedGltf | null }) {
  const nodes = useMemo(() => buildNodes(skills, budget.galaxyNodes, tone, hueSpread), [skills, budget.galaxyNodes, tone, hueSpread]);
  const branches = useMemo(() => buildBranches(), []);
  const stemGeometry = useMemo(() => buildStemGeometry(branches), [branches]);
  const buds = useMemo(() => layoutBuds(nodes, branches), [nodes, branches]);
  const indexById = useMemo(() => new Map(buds.map((bud, index) => [bud.node.skill.id, index])), [buds]);
  /** Scroll-driven sway: energy in from movement, damped out to rest. */
  const swayState = useRef({ energy: 0, last: 0 });

  useEffect(() => () => stemGeometry.dispose(), [stemGeometry]);

  const budColor = useMemo(() => new THREE.Color(tone), [tone]);
  const stemColor = useMemo(() => new THREE.Color(toneSoft).lerp(new THREE.Color("#3d6b3f"), 0.5), [toneSoft]);

  const rootRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  // `rootRef` doubles as the animation root: the mesh mounts as its child
  // below (via `<primitive>`), so this is the actual ancestor `useAnimations`
  // needs to resolve the `grow` clip's bone-name tracks against, not a
  // sibling group nothing else sees.
  const { actions, mixer } = useAnimations(gltf?.animations ?? EMPTY_CLIPS, rootRef);
  const vineMesh = gltf?.nodes.vine as THREE.SkinnedMesh | undefined;

  useEffect(() => {
    const action = actions.grow;
    if (!action) return;
    // Played once and immediately paused: the action becomes an active,
    // scrubbable pose rather than something advancing on its own — §1's
    // "scroll is the only story parameter" applies to this mixer too.
    action.reset().play();
    action.paused = true;
    return () => {
      action.stop();
    };
  }, [actions]);

  // Own material rather than the exporter's mapless placeholder (S5: a
  // scenery's material comes from the scenery, never the asset). Kept stable
  // across renders so assigning it to `vineMesh.material` below only has to
  // happen once per mesh; its colour is re-synced by the effect beneath it
  // whenever `stemColor` actually changes, not every frame.
  const trunkMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: stemColor, roughness: 0.85, metalness: 0 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    if (vineMesh) vineMesh.material = trunkMaterial;
  }, [vineMesh, trunkMaterial]);
  useEffect(() => {
    trunkMaterial.color.set(stemColor);
  }, [trunkMaterial, stemColor]);
  useEffect(() => () => trunkMaterial.dispose(), [trunkMaterial]);

  const budGeometry = useMemo(() => new THREE.IcosahedronGeometry(NODE_RADIUS * 0.85, 0), []);
  useEffect(() => () => budGeometry.dispose(), [budGeometry]);

  useFrame((_state, rawDelta) => {
    const root = rootRef.current;
    const instanced = instancedRef.current;
    if (!root || !instanced) return;
    const delta = clampDelta(rawDelta);

    const { entry: entryProgress, exit: exitProgress } = sceneSectionEnvelope(sceneScroll.progress, sectionIndex);
    const formAmount = reducedMotion ? 1 : entranceEase(entrance, entryProgress);
    // Scroll-gated on the section's *entrance* as well as its exit. Read off
    // `exit` alone, the whole graph sat at full scale from the first frame of
    // the page — Skills' nodes crossed Hero's tagline and About's copy two
    // sections before their own, which is the one thing the scene must never
    // do. The ramp is deliberately short (the same 0.12 About's fragments
    // use): the scattered pose is still on screen for the great majority of
    // the entrance, so `formAmount`'s scatter-to-cluster choreography below is
    // unchanged — this only stops it happening over somebody else's type.
    // Not gated on `reducedMotion`, for the same reason `exit` is not: scroll
    // is the story parameter, not an animation to switch off.
    const appear = THREE.MathUtils.smoothstep(entryProgress, 0, 0.12);
    const presence = appear * (1 - THREE.MathUtils.smoothstep(exitProgress, 0, 1));
    root.visible = presence > 0.01;
    if (!root.visible) return;

    root.scale.setScalar(presence);
    // Secondary motion: the vine leans as the reader scrolls and settles back
    // to upright when they stop, rather than swinging on a clock of its own.
    // `scenery.ts` states that nothing in garden moves on its own clock, only
    // in response to scroll; before Phase L this line was the counter-example,
    // a `sin(sceneTime.elapsed)` that never came to rest.
    const scrolled = sceneScroll.progress - swayState.current.last;
    swayState.current.last = sceneScroll.progress;
    swayState.current.energy = damp(
      THREE.MathUtils.clamp(swayState.current.energy + scrolled * SWAY_GAIN, -1, 1),
      0,
      SCENE_SMOOTHING.glide,
      delta,
    );
    root.rotation.z = reducedMotion ? 0 : swayState.current.energy * SWAY_AMPLITUDE * formAmount;

    // Grow clip: scrubbed straight from entry progress, never played —
    // §1's "scroll is the only story parameter."
    const action = actions.grow;
    if (action) {
      const clip = action.getClip();
      action.time = THREE.MathUtils.clamp(entryProgress, 0, 1) * (clip.duration || 1);
      mixer.update(0);
    }
    // Bloom: the flower head opens as the section settles in, not on a
    // wall-clock loop and not per-bud — one shared influence for the whole
    // crown.
    if (vineMesh?.morphTargetInfluences) {
      vineMesh.morphTargetInfluences[0] = reducedMotion ? formAmount : THREE.MathUtils.smoothstep(entryProgress, 0.15, 0.85);
    }

    const interactive = !reducedMotion && presence > 0.05;
    const hoveredId = interactive ? useSceneInteractionStore.getState().hoveredSkillId : null;
    const hoveredIndex = hoveredId === null ? -1 : (indexById.get(hoveredId) ?? -1);

    buds.forEach((bud, index) => {
      budTransform(bud.branch, bud.arcT, scratchPosition, scratchTangent);

      // Sprouts in along the branch as the section forms — near-the-trunk
      // buds first, same `stagger` idiom `monoliths.tsx` uses for its
      // near-to-far wave.
      const grow = reducedMotion ? 1 : entranceStagger(entrance, entryProgress, index, buds.length);
      const focusTarget = index === hoveredIndex ? 1 : 0;
      const focus = clamp01(springStep(bud.focus, focusTarget, "settle", delta));

      const scale = (0.001 + grow) * (1 + focus * 0.6);
      scratchQuaternion.setFromUnitVectors(UP, scratchTangent.lengthSq() > 0 ? scratchTangent.normalize() : UP);
      scratchScale.setScalar(scale);
      scratchMatrix.compose(scratchPosition, scratchQuaternion, scratchScale);
      instanced.setMatrixAt(index, scratchMatrix);

      scratchColor.copy(bud.node.color).lerp(budColor, 0.3 + focus * 0.5);
      instanced.setColorAt(index, scratchColor);
    });
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;

    if (materialRef.current) materialRef.current.emissiveIntensity = 0.2 + formAmount * 0.3;
  });

  return (
    <group ref={rootRef} position={[0, VINE_Y_OFFSET, 0]}>
      {/* The procedural stem system: every category's branch, one draw call. */}
      <mesh geometry={stemGeometry} dispose={null}>
        <meshStandardMaterial color={stemColor} roughness={0.9} metalness={0} />
      </mesh>

      {/* The hero organic form, mounted as a child so it inherits `presence`
          and the breathing sway above — not a sibling `useAnimations` (bound
          to this same `rootRef`) would never resolve its bone tracks
          against. `low` tier and the loading fallback (S10) swap in the same
          silhouette family without a skeleton, a clip, or a fetch. */}
      {gltf ? <primitive object={gltf.scene} /> : <VineStatic color={stemColor} />}

      {/* One instanced mesh for every bud — a list of N skills gets one draw
          call, never N. */}
      <instancedMesh ref={instancedRef} args={[budGeometry, undefined, Math.max(1, buds.length)]}>
        <meshStandardMaterial ref={materialRef} color={budColor} emissive={budColor} emissiveIntensity={0.2} roughness={0.4} metalness={0.1} />
      </instancedMesh>
    </group>
  );
}

/** A cheap, static stand-in for the skinned trunk — same taper, same crown, no bones, no morph, no fetch. Used at `low` tier and while `vine.glb` is still loading (S10). */
function VineStatic({ color }: { color: THREE.Color }) {
  const geometry = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.018, 0.085, VINE_HEIGHT, 6, 1, true);
    trunk.translate(0, VINE_HEIGHT / 2, 0);
    const bulb = new THREE.IcosahedronGeometry(0.17, 0);
    bulb.translate(0, VINE_HEIGHT + 0.1, 0);
    const merged = mergeGeometries([trunk.toNonIndexed(), bulb.toNonIndexed()], false);
    trunk.dispose();
    bulb.dispose();
    return merged ?? trunk;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} dispose={null}>
      <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
    </mesh>
  );
}
