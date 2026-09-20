"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { clampDelta, damp, SCENE_SMOOTHING, springStep, type SpringState } from "@/lib/experience/scene-motion";
import { sceneScroll } from "@/lib/experience/scene-scroll";
import { useSceneInteractionStore } from "@/lib/store/scene-interaction-store";
import { SKILL_CATEGORIES, type Skill, type SkillCategory } from "@/lib/types/content";

import { sceneSectionEnvelope } from "../../scene/camera-rig";
import { buildNodes, clamp01, NODE_RADIUS, type GalaxyNode } from "./layout";

export interface OrreryProps {
  skills: Skill[];
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  budget: SceneBudget;
  /** This section's waypoint index: `entry` drives the scatter-to-orbit, `exit` fades the field out. */
  sectionIndex: number;
}

/** Innermost ring radius, and how much each successive category ring grows — concentric, not clustered (§4.2). */
const RING_BASE_RADIUS = 1.1;
const RING_STEP = 0.5;
/** Each ring tilts a little more than the last, so the orrery reads as a real instrument rather than a flat dial. */
const RING_TILT_BASE = THREE.MathUtils.degToRad(10);
const RING_TILT_STEP = THREE.MathUtils.degToRad(8);
/** Innermost ring's angular speed (rad/s, pre-timescale); outer rings orbit slower, as real orbits do. */
const RING_SPEED_BASE = 0.16;
/** Where a hovered node slews to — the ring's own zero reference, i.e. its "12 o'clock". */
const FRONT_ANGLE = 0;

/** How strongly a hovered node brightens and grows. */
const FOCUS_EPSILON = 0.002;
const MIN_INTERACTIVE_PRESENCE = 0.05;

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const DEFAULT_FORWARD = new THREE.Vector3(1, 0, 0);

interface RingSpec {
  category: SkillCategory;
  radius: number;
  /** The ring's rotation axis — its orbital plane's normal. */
  orbitAxis: THREE.Vector3;
  /** The ring's own "theta = 0" direction, in the ring's plane. */
  radial0: THREE.Vector3;
  speed: number;
}

/**
 * One ring per skill category, concentric and each tilted a little further —
 * built once, since nothing about a ring itself ever changes at runtime, only
 * where a node sits on it.
 */
function buildRings(): RingSpec[] {
  return SKILL_CATEGORIES.map((category, index) => {
    const tilt = RING_TILT_BASE + index * RING_TILT_STEP;
    // A reference direction tilted out of the flat plane — cross it with
    // world-up (S9's first cross product) to get the axis that ring actually
    // turns around, rather than assuming every ring spins flat around Y.
    const radial0 = new THREE.Vector3(Math.cos(tilt), Math.sin(tilt) * 0.4, Math.sin(tilt) * 0.6).normalize();
    const orbitAxis = new THREE.Vector3().crossVectors(WORLD_UP, radial0).normalize();
    return {
      category,
      radius: RING_BASE_RADIUS + index * RING_STEP,
      orbitAxis,
      radial0,
      speed: RING_SPEED_BASE / (1 + index * 0.35),
    };
  });
}

/**
 * Per-node runtime state, sized to one `nodes` layout — mirrors
 * `constellation.tsx`'s `FrameState` so the two variants read the same way.
 */
interface FrameState {
  nodes: GalaxyNode[];
  /** Continuous orbital phase, one per node — never reset, only ever advanced or slewed. */
  angle: Float32Array;
  base: THREE.Vector3[];
  rendered: THREE.Vector3[];
  focus: SpringState[];
}

function createFrameState(nodes: GalaxyNode[]): FrameState {
  // Two passes: the first counts how many nodes share each category, the
  // second spaces that category's nodes evenly around its ring — the count
  // is not known until every node has been visited once.
  const countByCategory = new Map<SkillCategory, number>();
  nodes.forEach((node) => countByCategory.set(node.skill.category, (countByCategory.get(node.skill.category) ?? 0) + 1));

  const slotByCategory = new Map<SkillCategory, number>();
  const angle = new Float32Array(nodes.length);
  nodes.forEach((node, index) => {
    const slot = slotByCategory.get(node.skill.category) ?? 0;
    slotByCategory.set(node.skill.category, slot + 1);
    const count = countByCategory.get(node.skill.category) ?? 1;
    angle[index] = (slot / count) * Math.PI * 2;
  });

  return {
    nodes,
    angle,
    base: nodes.map((node) => node.scattered.clone()),
    rendered: nodes.map((node) => node.scattered.clone()),
    focus: nodes.map<SpringState>(() => ({ value: 0, velocity: 0 })),
  };
}

const scratchRadial = new THREE.Vector3();
const scratchOrbitQuat = new THREE.Quaternion();
const scratchFrontQuat = new THREE.Quaternion();
const scratchTangent = new THREE.Vector3();
const scratchOrientation = new THREE.Quaternion();
const scratchDesired = new THREE.Vector3();

/**
 * Observatory's Skills identity (§4.2): category clusters become concentric
 * orbital rings instead of a settled constellation blob. A node's position is
 * never integrated by accumulating an Euler angle — every frame rebuilds a
 * fresh orbit quaternion from the node's running phase via
 * `setFromAxisAngle`, and a hovered node's "come to the front" reaction is a
 * `slerp` between that orbit quaternion and a fixed front-facing one, not a
 * position lerp. Hovering is still DOM-driven (`scene-interaction-store`) —
 * the canvas itself never raycasts.
 */
export function Orrery({ skills, tone, toneSoft, reducedMotion, budget, sectionIndex }: OrreryProps) {
  const nodes = useMemo(() => buildNodes(skills, budget.galaxyNodes, tone), [skills, budget.galaxyNodes, tone]);
  const rings = useMemo(() => buildRings(), []);
  const ringByCategory = useMemo(() => new Map(rings.map((ring) => [ring.category, ring])), [rings]);
  const indexById = useMemo(() => new Map(nodes.map((node, index) => [node.skill.id, index])), [nodes]);

  const ringSegmentCount = 56;
  const ringGeometry = useMemo(() => {
    const positions = new Float32Array(rings.length * ringSegmentCount * 2 * 3);
    let offset = 0;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    rings.forEach((ring) => {
      for (let segment = 0; segment < ringSegmentCount; segment += 1) {
        const theta0 = (segment / ringSegmentCount) * Math.PI * 2;
        const theta1 = ((segment + 1) / ringSegmentCount) * Math.PI * 2;
        a.copy(ring.radial0).applyAxisAngle(ring.orbitAxis, theta0).multiplyScalar(ring.radius);
        b.copy(ring.radial0).applyAxisAngle(ring.orbitAxis, theta1).multiplyScalar(ring.radius);
        positions[offset] = a.x;
        positions[offset + 1] = a.y;
        positions[offset + 2] = a.z;
        positions[offset + 3] = b.x;
        positions[offset + 4] = b.y;
        positions[offset + 5] = b.z;
        offset += 6;
      }
    });
    return positions;
  }, [rings]);

  // Rings are instrument markings, not the accent itself: dim at rest
  // (`toneSoft`), the same two-tone convention `constellation.tsx`'s edges use.
  const ringColor = useMemo(() => new THREE.Color(toneSoft), [toneSoft]);

  const groupRef = useRef<THREE.Group>(null);
  const nodeRefs = useRef<(THREE.Group | null)[]>([]);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const materialRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const ringLineRef = useRef<THREE.LineSegments>(null);

  const frameRef = useRef<FrameState | null>(null);

  useFrame((_state, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;
    const delta = clampDelta(rawDelta);

    let frame = frameRef.current;
    if (frame?.nodes !== nodes) {
      frame = createFrameState(nodes);
      frameRef.current = frame;
    }

    const { entry: entryProgress, exit: exitProgress } = sceneSectionEnvelope(sceneScroll.progress, sectionIndex);
    const formAmount = reducedMotion ? 1 : THREE.MathUtils.smoothstep(entryProgress, 0, 1);
    const presence = 1 - THREE.MathUtils.smoothstep(exitProgress, 0, 1);
    group.scale.setScalar(presence);

    const interactive = !reducedMotion && presence > MIN_INTERACTIVE_PRESENCE;
    const hoveredId = interactive ? useSceneInteractionStore.getState().hoveredSkillId : null;
    const hoveredIndex = hoveredId === null ? -1 : (indexById.get(hoveredId) ?? -1);

    nodes.forEach((node, index) => {
      const ring = ringByCategory.get(node.skill.category);
      const nodeGroup = nodeRefs.current[index];
      const base = frame.base[index];
      const rendered = frame.rendered[index];
      const focusState = frame.focus[index];
      if (!ring || !nodeGroup || !base || !rendered || !focusState) return;

      // The orbit never stops: hovering blends the *orientation* toward
      // front, it does not freeze the phase, so un-hovering has nothing to
      // snap back from.
      if (!reducedMotion) frame.angle[index] = (frame.angle[index] ?? 0) + ring.speed * delta;
      const angle = frame.angle[index] ?? 0;

      scratchOrbitQuat.setFromAxisAngle(ring.orbitAxis, angle);
      scratchRadial.copy(ring.radial0).applyQuaternion(scratchOrbitQuat);

      const focusTarget = index === hoveredIndex ? 1 : 0;
      const focus = clamp01(springStep(focusState, focusTarget, "settle", delta));

      if (focus > FOCUS_EPSILON) {
        // "Slews to bring it to the front": blend the orbit orientation
        // toward the ring's own front-facing one, by slerp — never a second
        // position lerp competing with the orbit above.
        scratchFrontQuat.setFromAxisAngle(ring.orbitAxis, FRONT_ANGLE);
        scratchOrbitQuat.slerp(scratchFrontQuat, focus);
        scratchRadial.copy(ring.radial0).applyQuaternion(scratchOrbitQuat);
      }

      scratchDesired.copy(scratchRadial).multiplyScalar(ring.radius);
      // Entry: nodes arrive from About's scatter arc, same idiom as
      // `constellation.tsx`, converging onto their orbit as the section forms.
      scratchDesired.lerpVectors(node.scattered, scratchDesired, formAmount);
      base.lerp(scratchDesired, reducedMotion ? 1 : 1 - Math.pow(1e-3, delta));
      rendered.copy(base);
      nodeGroup.position.copy(rendered);

      // Faces its direction of travel — the orbit's tangent, the second
      // cross product the ring earns (`orbitAxis × radial`), used to orient
      // geometry rather than left as an unused vector.
      scratchTangent.crossVectors(ring.orbitAxis, scratchRadial).normalize();
      scratchOrientation.setFromUnitVectors(DEFAULT_FORWARD, scratchTangent);
      nodeGroup.quaternion.copy(scratchOrientation);

      const mesh = meshRefs.current[index];
      if (mesh) mesh.scale.setScalar(1 + focus * 0.5);
      const material = materialRefs.current[index];
      if (material) material.emissiveIntensity = 0.18 + focus * 0.9;
    });

    if (ringLineRef.current) {
      const material = ringLineRef.current.material as THREE.LineBasicMaterial;
      material.opacity = damp(material.opacity, 0.3 * formAmount, SCENE_SMOOTHING.glide, delta);
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, index) => (
        <group
          key={node.skill.id}
          ref={(el) => {
            nodeRefs.current[index] = el;
          }}
        >
          <mesh
            ref={(el) => {
              meshRefs.current[index] = el;
            }}
          >
            <icosahedronGeometry args={[NODE_RADIUS, 0]} />
            {/* Observatory's material identity: uniformly metal, not the
                constellation's alternating 70/20/10 mix — a night instrument
                is machined, not half ceramic. */}
            <meshStandardMaterial
              ref={(el) => {
                materialRefs.current[index] = el;
              }}
              color={node.color}
              emissive={node.color}
              emissiveIntensity={0.18}
              metalness={0.9}
              roughness={0.22}
            />
          </mesh>
        </group>
      ))}

      {/* The five orbital rings, one static buffer — a fixed shape animated
          only by opacity, so this costs exactly the one draw call
          `constellation.tsx`'s edge web already spent. */}
      <lineSegments ref={ringLineRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ringGeometry, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={ringColor} transparent opacity={0} />
      </lineSegments>
    </group>
  );
}
