"use client";

import { useRef } from "react";
import * as THREE from "three";

import { HERO_SCULPTURE_RADIUS } from "../../scene/geometry";
import { useHeroComposition, type HeroFormProps, type HeroTemperament } from "./composition";

/** The glass shell's opacity at full presence. */
const SHELL_OPACITY = 0.4;

/**
 * Atelier — *crafted*. Calm and editorial: one slow revolution, a shallow
 * breath, nothing else. This is Phase A's original sculpture unchanged, so
 * the studio stays pixel-recognizable as "the site" (§4.1); the entrance is
 * the only addition, and it is the short soft settle atelier's temperament
 * calls for.
 */
const TEMPERAMENT: HeroTemperament = {
  // One full revolution every 14s — mid the spec's 8-20s band.
  idleSpeed: (Math.PI * 2) / 14,
  breathAmount: 0.03,
  breathSeconds: 6,
  maxTilt: THREE.MathUtils.degToRad(5),
  scrollRotation: THREE.MathUtils.degToRad(60),
  arriveSeconds: 0.9,
  // The ring's outer radius — what reaches the type, not the sphere inside it.
  halfExtent: 1.6,
};

/**
 * A glass sphere (the primary focal point) with a fixed-tilt metal ring (the
 * one secondary element) — glass/metal material contrast per the spec,
 * rendered with real lights rather than an HDR environment map so the
 * persistent canvas never needs a texture fetch.
 */
export function PlatonicHero(props: HeroFormProps) {
  const { tone, toneSoft, budget } = props;
  const groupRef = useRef<THREE.Group>(null);
  const shellRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const ringRef = useRef<THREE.MeshStandardMaterial>(null);

  useHeroComposition(groupRef, props, TEMPERAMENT, (frame) => {
    if (shellRef.current) shellRef.current.opacity = SHELL_OPACITY * frame.columnPresence;
    if (ringRef.current) ringRef.current.opacity = frame.columnPresence;
  });

  return (
    <group ref={groupRef}>
      {/* Primary focal object: a glass sphere — no transmission/env-map, so
          it stays cheap and correct on a transparent canvas background. */}
      <mesh>
        <sphereGeometry args={[HERO_SCULPTURE_RADIUS, budget.segments, budget.segments]} />
        <meshPhysicalMaterial
          ref={shellRef}
          color={toneSoft}
          transparent
          opacity={SHELL_OPACITY}
          roughness={0.12}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>
      {/* One secondary element, fixed at a tilt (a pose, not a second
          spinning object) for metal contrast against the glass sphere. */}
      <mesh rotation={[Math.PI / 2.6, 0.3, 0]}>
        <torusGeometry args={[1.55, 0.05, Math.max(8, Math.round(budget.segments / 4)), budget.segments]} />
        {/* Transparent so it can fall back to `COLUMN_FLOOR` where the page is
            too narrow to give it a gutter; opaque at full presence. */}
        <meshStandardMaterial ref={ringRef} color={tone} roughness={0.25} metalness={1} transparent />
      </mesh>
    </group>
  );
}
