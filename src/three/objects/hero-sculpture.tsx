"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";

interface HeroSculptureProps {
  tone: string;
  toneSoft: string;
  pointer: { current: { x: number; y: number } };
  reducedMotion: boolean;
  /** 0 at rest in Hero, 1 once the camera has fully arrived at About. */
  heroProgress: number;
  /** 0 while resident in Hero/About, 1 once the camera has moved on toward Skills — fades the sculpture out. */
  exitProgress: number;
  budget: SceneBudget;
}

/** One full idle revolution every 14s — mid the spec's 8–20s band. */
const IDLE_REVOLUTION_SECONDS = 14;
const IDLE_SPEED = (Math.PI * 2) / IDLE_REVOLUTION_SECONDS;
/** ≤3–6° damped mouse parallax — 5° chosen as the band's centre. */
const MAX_TILT = THREE.MathUtils.degToRad(5);
/** 30–90° scroll-driven rotation into About — 60° chosen as the band's centre. */
const SCROLL_ROTATION = THREE.MathUtils.degToRad(60);
/** A slow ~6s breathing cycle, well inside the spec's 8–30s ambient-loop band
 * (breathing reads faster than a full ambient loop on purpose — it is a
 * pulse, not a scene transition). */
const BREATH_SPEED = (Math.PI * 2) / 6;
const BREATH_AMOUNT = 0.03;

/**
 * Hero's one sophisticated central object: a glass sphere (the primary focal
 * point) with a fixed-tilt metal ring (the one secondary element) — glass/
 * metal material contrast per the spec, rendered with real lights rather than
 * an HDR environment map so the persistent canvas never needs a texture
 * fetch. Idle rotation + a subtle breathing scale run continuously; damped
 * mouse parallax and scroll-driven rotation into About are additive on top of
 * the same group transform, never a second competing animation.
 */
export function HeroSculpture({
  tone,
  toneSoft,
  pointer,
  reducedMotion,
  heroProgress,
  exitProgress,
  budget,
}: HeroSculptureProps) {
  const groupRef = useRef<THREE.Group>(null);
  const idleAngle = useRef(0);
  const tilt = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (!reducedMotion) {
      idleAngle.current += delta * IDLE_SPEED;
    }

    // Reduced motion: parallax target collapses to centre and the damp below
    // is 1, so tilt lands there immediately rather than easing out — no
    // continuous motion keeps running once it arrives.
    const targetTiltX = reducedMotion ? 0 : pointer.current.y * MAX_TILT;
    const targetTiltY = reducedMotion ? 0 : pointer.current.x * MAX_TILT;
    const damp = reducedMotion ? 1 : 1 - Math.pow(0.001, delta);
    tilt.current.x = THREE.MathUtils.lerp(tilt.current.x, targetTiltX, damp);
    tilt.current.y = THREE.MathUtils.lerp(tilt.current.y, targetTiltY, damp);

    const scrollAngle = heroProgress * SCROLL_ROTATION;

    group.rotation.y = idleAngle.current + tilt.current.y + scrollAngle;
    group.rotation.x = tilt.current.x;

    const breathe = reducedMotion ? 1 : 1 + Math.sin(state.clock.elapsedTime * BREATH_SPEED) * BREATH_AMOUNT;
    // Recedes once the story has moved on to Skills — a scale fade, not an
    // abrupt unmount, so the hand-off to About's fragments stays continuous.
    const presence = 1 - THREE.MathUtils.smoothstep(exitProgress, 0, 1);
    group.scale.setScalar(breathe * presence);
  });

  return (
    <group ref={groupRef}>
      {/* Primary focal object: a glass sphere — no transmission/env-map, so
          it stays cheap and correct on a transparent canvas background. */}
      <mesh>
        <sphereGeometry args={[1, budget.segments, budget.segments]} />
        <meshPhysicalMaterial
          color={toneSoft}
          transparent
          opacity={0.4}
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
        <meshStandardMaterial color={tone} roughness={0.25} metalness={1} />
      </mesh>
    </group>
  );
}
