"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { sphericalCloud } from "@/lib/experience/random";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";
import type { ProficiencyLevel, Skill } from "@/lib/types/content";

/**
 * The react-three-fiber scene behind `SkillGalaxy`, split into its own file so
 * `next/dynamic` has a distinct module to code-split — same reasoning as
 * `hero-core-scene.tsx`: `three` and `@react-three/fiber` must never enter a
 * bundle a Normal Mode (or Game Mode, before the first click) visitor loads.
 *
 * Node placement is a deterministic Fibonacci-sphere lattice, not
 * `sphericalCloud()`. That helper is right for a formless dust cloud, but
 * every node here is a real, individually-clickable technology, so it needs
 * an even, gap-free layout with no seed to reshuffle on re-render.
 */

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function fibonacciPoint(index: number, count: number, radius: number): [number, number, number] {
  const y = count > 1 ? 1 - (index / (count - 1)) * 2 : 0;
  const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = GOLDEN_ANGLE * index;
  return [Math.cos(theta) * ringRadius * radius, y * radius * 0.75, Math.sin(theta) * ringRadius * radius];
}

/** Real data, not decoration: a higher proficiency renders as a bigger, brighter star. */
const PROFICIENCY_SCALE: Record<ProficiencyLevel, number> = {
  learning: 0.7,
  working: 0.85,
  proficient: 1,
  expert: 1.25,
};
const DEFAULT_NODE_SCALE = 0.85;
/** Base radius a node's icosahedron is drawn at before the proficiency/hover multiplier. */
const NODE_UNIT = 0.22;

interface SkillGalaxySceneProps {
  active: boolean;
  budget: SceneBudget;
  pointer: { current: { x: number; y: number } };
  tone: string;
  toneSoft: string;
  skills: Skill[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SkillGalaxyScene({
  active,
  budget,
  pointer,
  tone,
  toneSoft,
  skills,
  selectedId,
  onSelect,
}: SkillGalaxySceneProps) {
  const reducedMotion = useMotionPreference();

  return (
    <Canvas
      dpr={[1, budget.maxDpr]}
      camera={{ position: [0, 0, 6.5], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      // Same off-screen/backgrounded/reduced-motion handling as the Hero core —
      // stop the loop rather than unmount, so buffers never need rebuilding.
      frameloop={!active ? "never" : reducedMotion ? "demand" : "always"}
    >
      <Core
        budget={budget}
        pointer={pointer}
        tone={tone}
        toneSoft={toneSoft}
        skills={skills}
        selectedId={selectedId}
        onSelect={onSelect}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
}

interface CoreProps {
  budget: SceneBudget;
  pointer: { current: { x: number; y: number } };
  tone: string;
  toneSoft: string;
  skills: Skill[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  reducedMotion: boolean;
}

function Core({ budget, pointer, tone, toneSoft, skills, selectedId, onSelect, reducedMotion }: CoreProps) {
  const group = useRef<THREE.Group>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const dust = useMemo(
    () => sphericalCloud(Math.round(budget.particles * 0.4), { seed: 23, inner: 3, outer: 4.2, flatten: 0.8 }),
    [budget.particles],
  );

  const nodes = useMemo(
    () =>
      skills.map((skill, index) => ({
        skill,
        position: fibonacciPoint(index, skills.length, 2.6),
      })),
    [skills],
  );

  useFrame((_state, delta) => {
    const current = group.current;
    if (!current || reducedMotion) return;

    current.rotation.y += delta * 0.06;
    current.rotation.x = THREE.MathUtils.lerp(current.rotation.x, pointer.current.y * 0.12, 0.04);
    current.rotation.y += pointer.current.x * 0.0004;
  });

  return (
    <group ref={group}>
      {/* Unlit throughout, same as the hero core — no lights to compute. */}
      {budget.particles > 0 ? (
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[dust, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color={toneSoft}
            size={0.015}
            sizeAttenuation
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      ) : null}

      {nodes.map(({ skill, position }) => {
        const isSelected = skill.id === selectedId;
        const isHovered = skill.id === hoveredId;
        const proficiencyScale = skill.proficiency ? PROFICIENCY_SCALE[skill.proficiency] : DEFAULT_NODE_SCALE;
        const scale = proficiencyScale * NODE_UNIT * (isSelected ? 1.6 : isHovered ? 1.3 : 1);

        return (
          <mesh
            key={skill.id}
            position={position}
            scale={scale}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(skill.id);
            }}
            onPointerOver={(event) => {
              event.stopPropagation();
              setHoveredId(skill.id);
            }}
            onPointerOut={() => setHoveredId((current) => (current === skill.id ? null : current))}
          >
            <icosahedronGeometry args={[1, 0]} />
            <meshBasicMaterial
              color={isSelected || isHovered ? tone : toneSoft}
              transparent
              opacity={isSelected ? 1 : 0.75}
            />
          </mesh>
        );
      })}
    </group>
  );
}
