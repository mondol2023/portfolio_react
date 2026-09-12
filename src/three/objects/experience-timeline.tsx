"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { EMPLOYMENT_TYPES, type Experience } from "@/lib/types/content";

interface ExperienceTimelineProps {
  experiences: Experience[];
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  /** 0 at rest in Skills, 1 once the camera has fully arrived at Experience. */
  entryProgress: number;
  /** 0 while resident in Experience, 1 once the camera has moved on toward Projects. */
  exitProgress: number;
}

interface TimelineNode {
  experience: Experience;
  position: THREE.Vector3;
  color: THREE.Color;
  metal: boolean;
}

const SPACING = 1.15;
/** How far the whole rail travels toward the camera across entry + exit — the "camera travels through it" read, done as object motion since only `CameraRig` moves the real camera. */
const TRAVEL_DISTANCE = 2.4;

function buildNodes(experiences: Experience[], tone: string): TimelineNode[] {
  const ranked = [...experiences].sort((a, b) => a.order - b.order);
  const baseHsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(tone).getHSL(baseHsl);

  return ranked.map((experience, index) => {
    const typeIndex = Math.max(0, EMPLOYMENT_TYPES.indexOf(experience.employmentType));
    const hue = (baseHsl.h + typeIndex / EMPLOYMENT_TYPES.length) % 1;
    const color = new THREE.Color().setHSL(hue, Math.max(baseHsl.s, 0.4), 0.55);
    const position = new THREE.Vector3(Math.sin(index * 0.8) * 0.5, Math.cos(index * 0.6) * 0.25, -index * SPACING);
    return { experience, position, color, metal: index % 2 === 1 };
  });
}

/**
 * Experience's identity per the spec: a spatial timeline the camera travels
 * through, replacing the flat pass a DOM scroll gives the same data with an
 * actual sense of depth. Roles line up in order along a gently wandering
 * rail; the whole rail glides toward the viewer as the section is entered and
 * keeps gliding — never reversing — as it is left, so the motion always
 * reads as "moving forward through the roles," never a reset. The current
 * role's marker breathes gently, the one ambient cue this section adds on
 * top of the shared entry/exit envelope every other section already uses.
 */
export function ExperienceTimeline({
  experiences,
  tone,
  toneSoft,
  reducedMotion,
  entryProgress,
  exitProgress,
}: ExperienceTimelineProps) {
  const nodes = useMemo(() => buildNodes(experiences, tone), [experiences, tone]);
  const currentIndex = nodes.findIndex((node) => node.experience.isCurrent);

  const railPositions = useMemo(() => {
    const array = new Float32Array(nodes.length * 3);
    nodes.forEach((node, index) => {
      array[index * 3] = node.position.x;
      array[index * 3 + 1] = node.position.y;
      array[index * 3 + 2] = node.position.z;
    });
    return array;
  }, [nodes]);

  const groupRef = useRef<THREE.Group>(null);
  const travelZ = useRef(0);
  const markerRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const damp = reducedMotion ? 1 : 1 - Math.pow(0.001, delta);
    const enter = reducedMotion ? 1 : THREE.MathUtils.smoothstep(entryProgress, 0, 1);
    const exit = THREE.MathUtils.smoothstep(exitProgress, 0, 1);
    // Entry and exit both push the rail the same direction — the motion never
    // reverses, it only ever continues "forward" through the timeline.
    const targetTravel = (enter + exit) * TRAVEL_DISTANCE;
    travelZ.current = reducedMotion ? targetTravel : THREE.MathUtils.lerp(travelZ.current, targetTravel, damp);
    group.position.z = travelZ.current;

    const presence = 1 - THREE.MathUtils.smoothstep(exitProgress, 0, 1);
    group.scale.setScalar(presence);

    if (currentIndex >= 0) {
      const marker = markerRefs.current[currentIndex];
      const material = marker?.material;
      if (material && !Array.isArray(material) && "emissiveIntensity" in material) {
        const breathe = reducedMotion ? 0.9 : 0.6 + Math.sin(state.clock.elapsedTime * 1.6) * 0.3;
        (material as THREE.MeshStandardMaterial).emissiveIntensity = breathe;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, index) => (
        <mesh
          key={node.experience.id}
          position={node.position}
          ref={(el) => {
            markerRefs.current[index] = el;
          }}
        >
          <octahedronGeometry args={[node.experience.isCurrent ? 0.16 : 0.12, 0]} />
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={node.experience.isCurrent ? 0.6 : 0.1}
            metalness={node.metal ? 0.85 : 0.2}
            roughness={node.metal ? 0.3 : 0.55}
          />
        </mesh>
      ))}

      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[railPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={toneSoft} transparent opacity={0.35} />
      </line>
    </group>
  );
}
