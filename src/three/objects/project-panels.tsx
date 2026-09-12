"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { seededRandom } from "@/lib/experience/random";
import { SPRING } from "@/lib/experience/springs";
import type { Project } from "@/lib/types/content";

interface ProjectPanelsProps {
  projects: Project[];
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  pointer: { current: { x: number; y: number } };
  /** 0 at rest in Experience, 1 once the camera has fully arrived at Projects — drives the depth-staggered entrance. */
  entryProgress: number;
  /** 0 while resident in Projects, 1 once the camera has moved on toward Contact — fades the whole deck out. */
  exitProgress: number;
}

interface PanelNode {
  project: Project;
  target: THREE.Vector3;
  scatterStart: THREE.Vector3;
  tiltZ: number;
  color: THREE.Color;
  metal: boolean;
  lead: boolean;
}

/** Horizontal gap between fanned panels, and how much further back each step from centre recedes. */
const FAN_SPACING_X = 0.85;
const FAN_DEPTH_STEP = 0.22;
/** Fraction of the entry span each successive panel's arrival lags behind the one before it. */
const STAGGER = 0.12;
const MAX_TILT_X = THREE.MathUtils.degToRad(4);
const MAX_TILT_Y = THREE.MathUtils.degToRad(6);

/** `Project.type` is free-form editorial text, not a fixed union like `SkillCategory` — hashed rather than indexed into a known list. */
function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash;
}

function buildPanels(projects: Project[], tone: string): PanelNode[] {
  const ranked = [...projects].sort((a, b) => a.order - b.order);
  const random = seededRandom(41);
  const baseHsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(tone).getHSL(baseHsl);
  const count = ranked.length;

  return ranked.map((project, index) => {
    const centered = index - (count - 1) / 2;
    const target = new THREE.Vector3(
      centered * FAN_SPACING_X,
      Math.abs(centered) * -0.1,
      -Math.abs(centered) * FAN_DEPTH_STEP,
    );
    const tiltZ = -centered * 0.05;
    // Arrives from behind and below its resting spot, not from a radial
    // scatter like About/Skills — this section's identity is depth, not
    // fragmentation.
    const scatterStart = target
      .clone()
      .add(new THREE.Vector3((random() - 0.5) * 0.3, -1 - random() * 0.4, -2.2 - random() * 0.6));

    const hue = (baseHsl.h + (hashString(project.type) % 6) / 6) % 1;
    const color = new THREE.Color().setHSL(hue, Math.max(baseHsl.s, 0.4), 0.55);

    return { project, target, scatterStart, tiltZ, color, metal: index % 2 === 1, lead: index === 0 };
  });
}

/**
 * Projects' identity per the spec — the "show-stopper" section. Real project
 * data (via `scene-content-store`) becomes a fanned deck of dimensional glass
 * panels: a dark shadow backing, a translucent glass slab, and an emissive
 * top rim (the layered depth §7 asks for — shadow → surface → highlight),
 * brighter and thicker on the lead project's panel to echo the DOM grid's own
 * emphasis treatment, plus a small floating marker on any panel `featured` in
 * the CMS. Panels arrive with a depth-staggered entrance — each one lagging
 * further behind the last — sliding forward out of the dark from behind
 * their resting spot rather than popping in together, then the whole deck
 * recedes (scale fade, same contract as every earlier section) on the way to
 * Contact. The one true piece of real R3F interactivity the spec calls for
 * here: the whole deck tilts toward the shared pointer through an actual
 * damped-spring integrator — reusing `SPRING.panel`'s stiffness/damping/mass
 * rather than a plain lerp — capped at the spec's ±4°/±6°, so it settles with
 * the same confident, faintly overshooting weight a physical panel would.
 */
export function ProjectPanels({
  projects,
  tone,
  toneSoft,
  reducedMotion,
  pointer,
  entryProgress,
  exitProgress,
}: ProjectPanelsProps) {
  const panels = useMemo(() => buildPanels(projects, tone), [projects, tone]);

  const deckRef = useRef<THREE.Group>(null);
  const panelRefs = useRef<(THREE.Group | null)[]>([]);
  const currentPositions = useRef<THREE.Vector3[]>(panels.map((panel) => panel.scatterStart.clone()));
  const tilt = useRef({ x: 0, y: 0 });
  const tiltVelocity = useRef({ x: 0, y: 0 });

  // A fresh projects fetch changes the panel count — rebuild the per-panel
  // scratch positions so stale entries never linger past a re-render.
  if (currentPositions.current.length !== panels.length) {
    currentPositions.current = panels.map((panel) => panel.scatterStart.clone());
  }

  useFrame((_state, rawDelta) => {
    const deck = deckRef.current;
    if (!deck) return;
    const delta = Math.min(rawDelta, 1 / 30);

    const presence = 1 - THREE.MathUtils.smoothstep(exitProgress, 0, 1);
    deck.scale.setScalar(presence);

    panels.forEach((panel, index) => {
      const panelGroup = panelRefs.current[index];
      const current = currentPositions.current[index];
      if (!panelGroup || !current) return;

      const staggered = reducedMotion
        ? 1
        : THREE.MathUtils.clamp((entryProgress - index * STAGGER) / Math.max(1 - index * STAGGER, 0.01), 0, 1);
      const formAmount = THREE.MathUtils.smoothstep(staggered, 0, 1);
      const damp = reducedMotion ? 1 : 1 - Math.pow(0.001, delta);

      const desired = panel.scatterStart.clone().lerp(panel.target, formAmount);
      current.lerp(desired, damp);
      panelGroup.position.copy(current);
      panelGroup.rotation.z = panel.tiltZ * formAmount;
    });

    // Cursor-tilt is pointer-reactive, not ambient motion — snapped flat
    // under reduced motion for the same reason Skills' hover glow is,
    // elsewhere in this scene.
    if (reducedMotion) {
      tilt.current.x = 0;
      tilt.current.y = 0;
    } else {
      const targetX = THREE.MathUtils.clamp(-pointer.current.y, -1, 1) * MAX_TILT_X;
      const targetY = THREE.MathUtils.clamp(pointer.current.x, -1, 1) * MAX_TILT_Y;
      const { stiffness, damping, mass } = SPRING.panel;

      const accelX = (stiffness * (targetX - tilt.current.x) - damping * tiltVelocity.current.x) / mass;
      tiltVelocity.current.x += accelX * delta;
      tilt.current.x += tiltVelocity.current.x * delta;

      const accelY = (stiffness * (targetY - tilt.current.y) - damping * tiltVelocity.current.y) / mass;
      tiltVelocity.current.y += accelY * delta;
      tilt.current.y += tiltVelocity.current.y * delta;
    }

    deck.rotation.x = tilt.current.x;
    deck.rotation.y = tilt.current.y;
  });

  return (
    <group ref={deckRef}>
      {panels.map((panel, index) => (
        <group
          key={panel.project.id}
          ref={(el) => {
            panelRefs.current[index] = el;
          }}
          scale={panel.lead ? 1.22 : 1}
        >
          {/* Shadow backing — the layered-depth spec's back-most plane. */}
          <RoundedBox args={[1.5, 0.95, 0.04]} radius={0.06} smoothness={2} position={[0, 0, -0.09]}>
            <meshStandardMaterial color={toneSoft} transparent opacity={0.3} roughness={0.9} metalness={0} />
          </RoundedBox>

          {/* Glass surface — the slab the project's content reads as sitting inside. */}
          <RoundedBox args={[1.4, 0.88, 0.05]} radius={0.07} smoothness={3}>
            <meshPhysicalMaterial
              color={panel.color}
              emissive={panel.color}
              emissiveIntensity={0.08}
              transmission={0.45}
              thickness={0.4}
              roughness={0.25}
              metalness={panel.metal ? 0.6 : 0.1}
              clearcoat={0.6}
              ior={1.4}
              transparent
            />
          </RoundedBox>

          {/* Highlight rim — brighter and thicker on the lead project's panel. */}
          <RoundedBox
            args={[1.4, panel.lead ? 0.09 : 0.06, 0.06]}
            radius={0.03}
            smoothness={2}
            position={[0, 0.44, 0.005]}
          >
            <meshStandardMaterial
              color={panel.color}
              emissive={panel.color}
              emissiveIntensity={panel.lead ? 0.9 : 0.5}
              metalness={0.4}
              roughness={0.3}
            />
          </RoundedBox>

          {panel.project.featured && (
            <mesh position={[0.62, 0.36, 0.08]}>
              <octahedronGeometry args={[0.05, 0]} />
              <meshStandardMaterial
                color={panel.color}
                emissive={panel.color}
                emissiveIntensity={1}
                metalness={0.2}
                roughness={0.3}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
