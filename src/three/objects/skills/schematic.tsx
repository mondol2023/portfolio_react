"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import {
  clampDelta,
  damp,
  dampFactor,
  entranceEase,
  type EntranceId,
  SCENE_SMOOTHING,
  springStep,
  type SpringState,
} from "@/lib/experience/scene-motion";
import { sceneScroll } from "@/lib/experience/scene-scroll";
import { useSceneInteractionStore } from "@/lib/store/scene-interaction-store";
import type { Skill } from "@/lib/types/content";

import { sceneSectionEnvelope } from "../../scene/camera-rig";
import { buildNodes, clamp01, NODE_RADIUS, type GalaxyNode } from "./layout";

export interface SchematicProps {
  skills: Skill[];
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  budget: SceneBudget;
  /** This section's waypoint index: `entry` drives the scatter-to-cluster, `exit` fades the graph out. */
  sectionIndex: number;
  /** `scenery.hueSpread` — how far category coding may tint a node off the scenery accent. */
  hueSpread: number;
  /** `scenery.entrance` — the world's arrival language, applied to this section's entry ramp. */
  entrance: EntranceId;
}

/** Same reaction shape as `constellation.tsx` — the layout and the physics are shared, only the paint differs. */
const HOVER_APPROACH = 0.15;
const NEIGHBOUR_DRIFT = 0.22;
const NEIGHBOUR_FOCUS = 0.55;
const HOVER_AMBIENT_RATE = 0.8;
const AMBIENT_AMPLITUDE = 0.05;
const AMBIENT_RATE = 0.42;
const FOCUS_EPSILON = 0.002;
const MIN_INTERACTIVE_PRESENCE = 0.05;

/** Connects consecutive same-category nodes into a chain — identical to `constellation.tsx`'s `buildEdges`. */
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
 * Blueprint's Skills variant (§4.4, Phase G): the same node/edge graph
 * `constellation.tsx` builds from `buildNodes()`, redrawn as unlit drafting
 * lines instead of glowing solids. Nodes are `EdgesGeometry` octahedra —
 * wireframe, no fill — and the connective lines are the same per-vertex-colour
 * `lineSegments` trick, just carrying the schematic's line colour instead of a
 * glow. Reusing the layout is the point (§5): a variant that re-derived the
 * clustering would drift from the constellation the moment either changed.
 */
export function Schematic({
  skills,
  tone,
  toneSoft,
  reducedMotion,
  budget,
  sectionIndex,
  hueSpread,
  entrance,
}: SchematicProps) {
  const { camera } = useThree();
  const nodes = useMemo(() => buildNodes(skills, budget.galaxyNodes, tone, hueSpread), [skills, budget.galaxyNodes, tone, hueSpread]);
  const edges = useMemo(() => buildEdges(nodes), [nodes]);
  const indexById = useMemo(() => new Map(nodes.map((node, index) => [node.skill.id, index])), [nodes]);
  const linePositions = useMemo(() => new Float32Array(Math.max(edges.length, 1) * 2 * 3), [edges.length]);
  const lineColors = useMemo(() => new Float32Array(Math.max(edges.length, 1) * 2 * 3), [edges.length]);

  const edgeRest = useMemo(() => new THREE.Color(toneSoft), [toneSoft]);
  const edgeLit = useMemo(() => new THREE.Color(tone).multiplyScalar(1.6), [tone]);

  const nodeGeometry = useMemo(
    () => new THREE.EdgesGeometry(new THREE.OctahedronGeometry(NODE_RADIUS * 1.6, 0)),
    [],
  );
  useEffect(() => () => nodeGeometry.dispose(), [nodeGeometry]);

  const groupRef = useRef<THREE.Group>(null);
  const nodeRefs = useRef<(THREE.Group | null)[]>([]);
  const lineRefs = useRef<(THREE.LineSegments | null)[]>([]);
  const materialRefs = useRef<(THREE.LineBasicMaterial | null)[]>([]);
  const linePositionAttrRef = useRef<THREE.BufferAttribute>(null);
  const lineColorAttrRef = useRef<THREE.BufferAttribute>(null);

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

    const followAmount = reducedMotion ? 1 : dampFactor(SCENE_SMOOTHING.glide, delta);
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
    group.scale.setScalar(presence);

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

      const line = lineRefs.current[index];
      if (line) line.scale.setScalar(1 + focus * (focused ? 0.6 : 0.15));
      const material = materialRefs.current[index];
      if (material) {
        material.opacity = 0.55 + focus * (focused ? 0.45 : 0.2);
        material.color.copy(node.color).lerp(edgeLit, focus * (focused ? 1 : 0.5));
      }
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
          <lineSegments
            ref={(el) => {
              lineRefs.current[index] = el;
            }}
            geometry={nodeGeometry}
          >
            <lineBasicMaterial
              ref={(el) => {
                materialRefs.current[index] = el;
              }}
              color={node.color}
              transparent
              opacity={0.55}
            />
          </lineSegments>
        </group>
      ))}

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute ref={linePositionAttrRef} attach="attributes-position" args={[linePositions, 3]} />
          <bufferAttribute ref={lineColorAttrRef} attach="attributes-color" args={[lineColors, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#ffffff" vertexColors transparent opacity={0.4} />
      </lineSegments>
    </group>
  );
}
