"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import {
  clampDelta,
  damp,
  dampFactor,
  SCENE_SMOOTHING,
  springStep,
  type SpringState,
} from "@/lib/experience/scene-motion";
import { sceneScroll } from "@/lib/experience/scene-scroll";
import { useSceneInteractionStore } from "@/lib/store/scene-interaction-store";
import type { Skill } from "@/lib/types/content";

import { sceneSectionEnvelope } from "../../scene/camera-rig";
import { buildNodes, clamp01, NODE_RADIUS, type GalaxyNode } from "./layout";

export interface ConstellationProps {
  skills: Skill[];
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  budget: SceneBudget;
  /** This section's waypoint index: `entry` drives the scatter-to-constellation, `exit` fades the graph out. */
  sectionIndex: number;
}

/** How far a hovered node travels toward the camera, as a fraction of the gap (spec: ~15%). */
const HOVER_APPROACH = 0.15;
/** How far each of the two nearest nodes closes on a hovered one. */
const NEIGHBOUR_DRIFT = 0.22;
/** A neighbour reacts, but never as loudly as the node the reader is actually on. */
const NEIGHBOUR_FOCUS = 0.55;
/** Ambient drift runs at this rate while anything is hovered — the field quiets around the reader's attention. */
const HOVER_AMBIENT_RATE = 0.8;
/** Idle bob: small and slow (a ~15s loop), so it reads as a live system rather than as animation. */
const AMBIENT_AMPLITUDE = 0.05;
const AMBIENT_RATE = 0.42;
/** Below this the spring has visually arrived; skip the offset maths entirely. */
const FOCUS_EPSILON = 0.002;
/** The group scales to zero on exit, and a zero-determinant matrix cannot be inverted for `worldToLocal`. */
const MIN_INTERACTIVE_PRESENCE = 0.05;

/** Connects consecutive same-category nodes into a chain — cheap, and reads as a constellation rather than a hub-and-spoke. */
function buildEdges(nodes: GalaxyNode[]): [number, number][] {
  const byCategory = new Map<string, number[]>();
  nodes.forEach((node, index) => {
    const list = byCategory.get(node.skill.category) ?? [];
    list.push(index);
    byCategory.set(node.skill.category, list);
  });

  const edges: [number, number][] = [];
  byCategory.forEach((indices) => {
    for (let i = 0; i < indices.length - 1; i += 1) {
      const a = indices[i];
      const b = indices[i + 1];
      if (a !== undefined && b !== undefined) edges.push([a, b]);
    }
  });
  return edges;
}

/**
 * Everything the frame loop mutates, sized to one `nodes` layout. `base` is the
 * settled layout position (scroll-driven, damped); `rendered` is where the node
 * actually ended up this frame, so edges stay welded to the moved nodes;
 * `attractors` is what each node is reacting *to* — itself when hovered, the
 * hovered node when it is a neighbour, `-1` when it has never reacted — kept
 * after release so the spring unwinds toward the point it grew from.
 */
interface FrameState {
  nodes: GalaxyNode[];
  base: THREE.Vector3[];
  rendered: THREE.Vector3[];
  focus: SpringState[];
  focusTargets: Float32Array;
  attractors: number[];
  ambient: { clock: number; rate: number };
}

function createFrameState(nodes: GalaxyNode[]): FrameState {
  return {
    nodes,
    base: nodes.map((node) => node.scattered.clone()),
    rendered: nodes.map((node) => node.scattered.clone()),
    focus: nodes.map<SpringState>(() => ({ value: 0, velocity: 0 })),
    focusTargets: new Float32Array(nodes.length),
    attractors: nodes.map(() => -1),
    ambient: { clock: 0, rate: 1 },
  };
}

const scratchDesired = new THREE.Vector3();
const scratchCameraLocal = new THREE.Vector3();
const scratchEdgeColor = new THREE.Color();

/**
 * Skills' identity per the spec: a node/constellation graph driven by the real
 * skill data model. Nodes begin on the arc About's fragments settle into and
 * reorganize into loose per-category clusters as the camera arrives, linked by
 * thin chained edges within each category. Capped at `budget.galaxyNodes`
 * before layout even runs, per that field's own purpose.
 *
 * Hovering a DOM pill is what makes it *live*: the id arrives through
 * `scene-interaction-store`, read with `getState()` so a hover never
 * re-renders the canvas. The hovered node eases toward the camera and
 * brightens, its two nearest nodes lean in, its edges light along their
 * length, and the whole field's idle drift slows — attention, rendered. The
 * canvas cannot raycast for itself (it is `pointer-events-none`, behind the
 * page), so the DOM owning the hover is the only path there is.
 */
export function Constellation({ skills, tone, toneSoft, reducedMotion, budget, sectionIndex }: ConstellationProps) {
  const { camera } = useThree();
  const nodes = useMemo(() => buildNodes(skills, budget.galaxyNodes, tone), [skills, budget.galaxyNodes, tone]);
  const edges = useMemo(() => buildEdges(nodes), [nodes]);
  const indexById = useMemo(() => new Map(nodes.map((node, index) => [node.skill.id, index])), [nodes]);
  const linePositions = useMemo(() => new Float32Array(Math.max(edges.length, 1) * 2 * 3), [edges.length]);
  const lineColors = useMemo(() => new Float32Array(Math.max(edges.length, 1) * 2 * 3), [edges.length]);

  // Edge colour is per-vertex so one `lineSegments` carries both the resting
  // web and the lit path through it; a second draw call for the highlight
  // would cost more than the effect is worth.
  const edgeRest = useMemo(() => new THREE.Color(toneSoft), [toneSoft]);
  const edgeLit = useMemo(() => new THREE.Color(tone).multiplyScalar(2.2), [tone]);

  const groupRef = useRef<THREE.Group>(null);
  const nodeRefs = useRef<(THREE.Group | null)[]>([]);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const materialRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const linePositionAttrRef = useRef<THREE.BufferAttribute>(null);
  const lineColorAttrRef = useRef<THREE.BufferAttribute>(null);

  const frameRef = useRef<FrameState | null>(null);

  useFrame((_state, rawDelta) => {
    const group = groupRef.current;
    if (!group) return;
    const delta = clampDelta(rawDelta);

    // Built here rather than in render: a skills fetch changes the node count,
    // and per-node scratch that outlived its layout would index past its end.
    let frame = frameRef.current;
    if (frame?.nodes !== nodes) {
      frame = createFrameState(nodes);
      frameRef.current = frame;
    }

    // Read per frame, not taken as a prop: scroll moves every frame, and
    // re-rendering the canvas at that rate is what `<ScrollPhysics>` avoids.
    const { entry: entryProgress, exit: exitProgress } = sceneSectionEnvelope(sceneScroll.progress, sectionIndex);

    const followAmount = reducedMotion ? 1 : dampFactor(SCENE_SMOOTHING.glide, delta);
    // Reduced motion: land fully clustered immediately, same contract as
    // Hero's idle motion and About's fragments.
    const formAmount = reducedMotion ? 1 : THREE.MathUtils.smoothstep(entryProgress, 0, 1);
    const presence = 1 - THREE.MathUtils.smoothstep(exitProgress, 0, 1);
    group.scale.setScalar(presence);

    // Reduced motion gets the DOM highlight and nothing else, per the control
    // matrix — the same reason pointer parallax is skipped elsewhere here.
    const interactive = !reducedMotion && presence > MIN_INTERACTIVE_PRESENCE;
    const hoveredId = interactive ? useSceneInteractionStore.getState().hoveredSkillId : null;
    const hoveredIndex = hoveredId === null ? -1 : (indexById.get(hoveredId) ?? -1);

    frame.focusTargets.fill(0);
    if (hoveredIndex >= 0) {
      frame.focusTargets[hoveredIndex] = 1;
      frame.attractors[hoveredIndex] = hoveredIndex;
      nodes[hoveredIndex]?.neighbours.forEach((neighbourIndex) => {
        frame.focusTargets[neighbourIndex] = NEIGHBOUR_FOCUS;
        frame.attractors[neighbourIndex] = hoveredIndex;
      });
    }

    frame.ambient.rate = damp(
      frame.ambient.rate,
      hoveredIndex >= 0 ? HOVER_AMBIENT_RATE : 1,
      SCENE_SMOOTHING.drift,
      delta,
    );
    if (!reducedMotion) frame.ambient.clock += delta * frame.ambient.rate;

    // One inverse per frame rather than one per reacting node. A frame-old
    // matrix is fine: the whole reaction is a spring away anyway.
    if (interactive) group.worldToLocal(scratchCameraLocal.copy(camera.position));

    nodes.forEach((node, index) => {
      const nodeGroup = nodeRefs.current[index];
      const base = frame.base[index];
      const rendered = frame.rendered[index];
      const focusState = frame.focus[index];
      if (!nodeGroup || !base || !rendered || !focusState) return;

      scratchDesired.lerpVectors(node.scattered, node.target, formAmount);
      base.lerp(scratchDesired, followAmount);
      rendered.copy(base);

      // Ambient and hover ride on top of the damped base rather than through
      // it: one filter per layer, so the release lands on the spring's own
      // ~600ms instead of that plus the follow's lag.
      if (!reducedMotion) {
        const t = frame.ambient.clock * AMBIENT_RATE + node.phase;
        rendered.x += Math.cos(t * 0.7) * AMBIENT_AMPLITUDE * 0.6;
        rendered.y += Math.sin(t) * AMBIENT_AMPLITUDE;
      }

      const focus = clamp01(springStep(focusState, frame.focusTargets[index] ?? 0, "settle", delta));
      const attractor = frame.attractors[index] ?? -1;
      const focused = attractor === index;
      if (focus > FOCUS_EPSILON && attractor >= 0) {
        if (focused) {
          rendered.lerp(scratchCameraLocal, HOVER_APPROACH * focus);
        } else {
          const anchor = frame.rendered[attractor];
          if (anchor) rendered.lerp(anchor, NEIGHBOUR_DRIFT * focus);
        }
      }

      nodeGroup.position.copy(rendered);

      const mesh = meshRefs.current[index];
      if (mesh) mesh.scale.setScalar(1 + focus * (focused ? 0.5 : 0.12));
      const material = materialRefs.current[index];
      if (material) material.emissiveIntensity = 0.15 + focus * (focused ? 0.85 : 0.3);
    });

    edges.forEach(([a, b], edgeIndex) => {
      const posA = frame.rendered[a];
      const posB = frame.rendered[b];
      if (!posA || !posB) return;
      const offset = edgeIndex * 6;
      linePositions[offset] = posA.x;
      linePositions[offset + 1] = posA.y;
      linePositions[offset + 2] = posA.z;
      linePositions[offset + 3] = posB.x;
      linePositions[offset + 4] = posB.y;
      linePositions[offset + 5] = posB.z;

      // A lit endpoint lights the whole edge: at this length a gradient along
      // the line is invisible, while two colours per edge is not.
      const lit = Math.max(frame.focus[a]?.value ?? 0, frame.focus[b]?.value ?? 0);
      scratchEdgeColor.copy(edgeRest).lerp(edgeLit, clamp01(lit));
      for (const vertex of [offset, offset + 3]) {
        lineColors[vertex] = scratchEdgeColor.r;
        lineColors[vertex + 1] = scratchEdgeColor.g;
        lineColors[vertex + 2] = scratchEdgeColor.b;
      }
    });
    if (linePositionAttrRef.current) linePositionAttrRef.current.needsUpdate = true;
    if (lineColorAttrRef.current) lineColorAttrRef.current.needsUpdate = true;
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
            <meshStandardMaterial
              ref={(el) => {
                materialRefs.current[index] = el;
              }}
              color={node.color}
              emissive={node.color}
              emissiveIntensity={0.15}
              metalness={node.metal ? 0.85 : 0.2}
              roughness={node.metal ? 0.3 : 0.55}
            />
          </mesh>
        </group>
      ))}

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute ref={linePositionAttrRef} attach="attributes-position" args={[linePositions, 3]} />
          <bufferAttribute ref={lineColorAttrRef} attach="attributes-color" args={[lineColors, 3]} />
        </bufferGeometry>
        {/* White base: the real colour lives in the vertex buffer, which is what lets one draw call carry the highlight. */}
        <lineBasicMaterial color="#ffffff" vertexColors transparent opacity={0.34} />
      </lineSegments>
    </group>
  );
}
