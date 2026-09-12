"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { seededRandom } from "@/lib/experience/random";
import { SKILL_CATEGORIES, type Skill } from "@/lib/types/content";

interface SkillGalaxyProps {
  skills: Skill[];
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  budget: SceneBudget;
  pointer: { current: { x: number; y: number } };
  /** 0 at rest in About, 1 once the camera has fully arrived at Skills — drives the scatter-to-constellation entrance. */
  entryProgress: number;
  /** 0 while resident in Skills, 1 once the camera has moved on toward Experience — fades the graph out. */
  exitProgress: number;
}

interface GalaxyNode {
  skill: Skill;
  scattered: THREE.Vector3;
  target: THREE.Vector3;
  color: THREE.Color;
  metal: boolean;
}

const NODE_RADIUS = 0.11;
/** Loose per-category cluster centres arranged around a ring, so the graph reads as distinct constellations rather than one blob. */
const CLUSTER_RADIUS = 1.7;

function buildNodes(skills: Skill[], maxNodes: number, tone: string): GalaxyNode[] {
  const random = seededRandom(29);
  const ranked = skills
    .filter((skill) => skill.enabled)
    .sort((a, b) => a.order - b.order)
    .slice(0, maxNodes);

  const baseHsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(tone).getHSL(baseHsl);

  const clusterCenters = new Map<string, THREE.Vector3>();
  SKILL_CATEGORIES.forEach((category, index) => {
    const angle = (index / SKILL_CATEGORIES.length) * Math.PI * 2;
    clusterCenters.set(
      category,
      new THREE.Vector3(Math.cos(angle) * CLUSTER_RADIUS, Math.sin(angle) * 0.9, -0.4 + Math.sin(angle * 2) * 0.3),
    );
  });

  return ranked.map((skill, index) => {
    const scatterRadius = 3 + random() * 2.2;
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const scattered = new THREE.Vector3(
      scatterRadius * Math.sin(phi) * Math.cos(theta),
      scatterRadius * Math.cos(phi) * 0.6,
      scatterRadius * Math.sin(phi) * Math.sin(theta) - 1,
    );

    const center = clusterCenters.get(skill.category) ?? new THREE.Vector3();
    const target = center
      .clone()
      .add(new THREE.Vector3((random() - 0.5) * 0.9, (random() - 0.5) * 0.7, (random() - 0.5) * 0.6));

    const categoryIndex = Math.max(0, SKILL_CATEGORIES.indexOf(skill.category));
    const hue = (baseHsl.h + categoryIndex / SKILL_CATEGORIES.length) % 1;
    const color = new THREE.Color().setHSL(hue, Math.max(baseHsl.s, 0.45), 0.6);

    return { skill, scattered, target, color, metal: index % 2 === 1 };
  });
}

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

const scratchDesired = new THREE.Vector3();
const scratchProjected = new THREE.Vector3();

/**
 * Skills' identity per the spec: a node/constellation graph driven by the
 * real skill data model. Nodes begin as a raw scatter (a galaxy) and gently
 * reorganize into loose per-category clusters as the camera arrives, linked
 * by thin chained edges within each category; hovering the shared pointer
 * near a node glows it and surfaces its name. Capped at `budget.galaxyNodes`
 * before layout even runs, per that field's own purpose.
 */
export function SkillGalaxy({
  skills,
  tone,
  toneSoft,
  reducedMotion,
  budget,
  pointer,
  entryProgress,
  exitProgress,
}: SkillGalaxyProps) {
  const { camera } = useThree();
  const nodes = useMemo(() => buildNodes(skills, budget.galaxyNodes, tone), [skills, budget.galaxyNodes, tone]);
  const edges = useMemo(() => buildEdges(nodes), [nodes]);
  const linePositions = useMemo(() => new Float32Array(Math.max(edges.length, 1) * 2 * 3), [edges.length]);

  const groupRef = useRef<THREE.Group>(null);
  const nodeRefs = useRef<(THREE.Group | null)[]>([]);
  const currentPositions = useRef<THREE.Vector3[]>(nodes.map((node) => node.scattered.clone()));
  const linePositionAttrRef = useRef<THREE.BufferAttribute>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // A fresh skills fetch changes the node count — rebuild the per-node
  // scratch positions so stale entries never linger past a re-render.
  if (currentPositions.current.length !== nodes.length) {
    currentPositions.current = nodes.map((node) => node.scattered.clone());
  }

  useFrame((_state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const damp = reducedMotion ? 1 : 1 - Math.pow(0.001, delta);
    // Reduced motion: land fully clustered immediately, same contract as
    // Hero's idle motion and About's fragments.
    const formAmount = reducedMotion ? 1 : THREE.MathUtils.smoothstep(entryProgress, 0, 1);
    const presence = 1 - THREE.MathUtils.smoothstep(exitProgress, 0, 1);

    nodes.forEach((node, index) => {
      const nodeGroup = nodeRefs.current[index];
      const current = currentPositions.current[index];
      if (!nodeGroup || !current) return;

      scratchDesired.lerpVectors(node.scattered, node.target, formAmount);
      current.lerp(scratchDesired, damp);
      nodeGroup.position.copy(current);
    });

    edges.forEach(([a, b], edgeIndex) => {
      const posA = currentPositions.current[a];
      const posB = currentPositions.current[b];
      if (!posA || !posB) return;
      const offset = edgeIndex * 6;
      linePositions[offset] = posA.x;
      linePositions[offset + 1] = posA.y;
      linePositions[offset + 2] = posA.z;
      linePositions[offset + 3] = posB.x;
      linePositions[offset + 4] = posB.y;
      linePositions[offset + 5] = posB.z;
    });
    if (linePositionAttrRef.current) linePositionAttrRef.current.needsUpdate = true;

    group.scale.setScalar(presence);

    // Hover glow is pointer-reactive, not ambient motion — skipped under
    // reduced motion for the same reason mouse parallax is, elsewhere in
    // this scene: a visitor asking for less motion gets no pointer-driven
    // behaviour at all.
    if (reducedMotion) {
      if (hoveredIndex !== null) setHoveredIndex(null);
      return;
    }

    let nearestIndex: number | null = null;
    let nearestDistance = 0.09;
    nodes.forEach((_node, index) => {
      const current = currentPositions.current[index];
      if (!current) return;
      scratchProjected.copy(current).project(camera);
      const dx = scratchProjected.x - pointer.current.x;
      const dy = scratchProjected.y - pointer.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    if (nearestIndex !== hoveredIndex) setHoveredIndex(nearestIndex);
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
          <mesh scale={hoveredIndex === index ? 1.6 : 1}>
            <icosahedronGeometry args={[NODE_RADIUS, 0]} />
            <meshStandardMaterial
              color={node.color}
              emissive={node.color}
              emissiveIntensity={hoveredIndex === index ? 0.9 : 0.15}
              metalness={node.metal ? 0.85 : 0.2}
              roughness={node.metal ? 0.3 : 0.55}
            />
          </mesh>
          {hoveredIndex === index && (
            <Html center distanceFactor={8} style={{ pointerEvents: "none" }}>
              <div
                style={{
                  whiteSpace: "nowrap",
                  fontSize: "11px",
                  color: toneSoft,
                  background: "rgba(10, 10, 14, 0.65)",
                  border: `1px solid ${tone}`,
                  borderRadius: "999px",
                  padding: "3px 10px",
                  transform: "translateY(-18px)",
                }}
              >
                {node.skill.name}
              </div>
            </Html>
          )}
        </group>
      ))}

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute ref={linePositionAttrRef} attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={toneSoft} transparent opacity={0.3} />
      </lineSegments>
    </group>
  );
}
