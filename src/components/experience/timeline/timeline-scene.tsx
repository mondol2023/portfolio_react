"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { seededRandom } from "@/lib/experience/random";
import { useCssColors } from "@/lib/experience/use-css-colors";
import { usePointer } from "@/lib/experience/use-pointer";
import { useSceneBudget } from "@/lib/experience/use-scene-budget";

/**
 * The timeline's environment: a tunnel of rings receding into the distance,
 * one per role, with a particle stream flowing past the camera. The camera
 * dollies to whichever era is active in the DOM list beside it, and the ring
 * nearest the camera reads as "now".
 *
 * Same two rules as the hero and galaxy scenes:
 *
 * 1. **No hex.** Colours come from `--tone`/`--bg`/`--fg` via `useCssColors`,
 *    scoped to the Experience section.
 * 2. **The budget decides the size.** Particle count and ring segment detail
 *    come from `useSceneBudget`, never hardcoded here.
 */

const TOKENS = ["--tone", "--bg", "--fg"] as const;
const TONE_SCOPE = '[data-tone="experience"]';
const SAFE = { tone: "white", bg: "black", fg: "white" };

/** Distance between one era's ring and the next, along -z. */
const SPACING = 7;
const RING_RADIUS = 2.6;

interface SceneProps {
  /** False while the section is off-screen or the tab is hidden — the loop stops. */
  active: boolean;
  /** True under `prefers-reduced-motion`: the world is built, but it holds still. */
  still: boolean;
  /** Index of the role currently centred in the DOM list. */
  eraIndex: number;
  eraCount: number;
  /** Smoothed 0..~3 scroll speed — the particle stream's throttle. */
  velocity: MotionValue<number>;
}

export default function TimelineScene({ active, still, eraIndex, eraCount, velocity }: SceneProps) {
  const budget = useSceneBudget();
  const colors = useCssColors(TOKENS, TONE_SCOPE);

  const tone = colors["--tone"] ?? SAFE.tone;
  const bg = colors["--bg"] ?? SAFE.bg;
  const fg = colors["--fg"] ?? SAFE.fg;

  const tunnelLength = Math.max(eraCount, 1) * SPACING;

  return (
    <Canvas
      dpr={[1, budget.maxDpr]}
      frameloop={active && !still ? "always" : "demand"}
      camera={{ position: [0, 0.3, 3.5], fov: 52, near: 0.1, far: tunnelLength + 30 }}
      gl={{ antialias: budget.tier !== "low", powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
    >
      <fog attach="fog" args={[bg, 3, tunnelLength * 0.85]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={0.5} color={fg} />

      <TunnelDolly eraIndex={eraIndex} still={still} tone={tone} />
      <TunnelRings
        eraCount={eraCount}
        eraIndex={eraIndex}
        tone={tone}
        fg={fg}
        segments={budget.segments}
        still={still}
      />
      <ParticleField
        count={budget.particles}
        length={tunnelLength}
        still={still}
        velocity={velocity}
        color={tone}
      />
    </Canvas>
  );
}

/**
 * Camera parallax and the dolly toward the active era.
 *
 * Fully frozen under `still`, matching `CameraRig` in the hero scene: reduced
 * motion holds the world at its first frame rather than snapping it around as
 * the visitor scrolls or tabs between roles. The per-era ring highlighting
 * still updates (it's driven by props, not this loop), so the section still
 * communicates "which era is active" without any animated camera work.
 */
function TunnelDolly({ eraIndex, still, tone }: { eraIndex: number; still: boolean; tone: string }) {
  const pointer = usePointer();
  const z = useRef(0);
  const light = useRef<THREE.PointLight>(null);

  useFrame(({ camera }, delta) => {
    if (still) return;

    const targetZ = -eraIndex * SPACING;
    z.current = THREE.MathUtils.damp(z.current, targetZ, 3.2, delta);

    camera.position.x = pointer.current.x * 0.4;
    camera.position.y = 0.3 + pointer.current.y * 0.25;
    camera.position.z = z.current + 3.5;
    camera.lookAt(0, 0, z.current - SPACING);

    if (light.current) light.current.position.z = z.current;
  });

  return <pointLight ref={light} intensity={20} distance={14} color={tone} />;
}

/**
 * The active ring reads brightest; neighbours dim outward and never vanish
 * entirely, so the tunnel still looks like a tunnel at rest.
 */
function ringOpacity(distance: number): number {
  return distance === 0 ? 0.9 : Math.max(0.1, 0.36 - distance * 0.08);
}

/** One wireframe ring per era, brightest at the one nearest the camera. */
function TunnelRings({
  eraCount,
  eraIndex,
  tone,
  fg,
  segments,
  still,
}: {
  eraCount: number;
  eraIndex: number;
  tone: string;
  fg: string;
  segments: number;
  still: boolean;
}) {
  const ringSegments = Math.min(segments * 2, 128);

  const rings = useMemo(() => {
    const toneColor = new THREE.Color(tone);
    const fgColor = new THREE.Color(fg);
    return Array.from({ length: eraCount }, (_, index) => {
      const t = eraCount > 1 ? index / (eraCount - 1) : 0;
      return { index, color: toneColor.clone().lerp(fgColor, t * 0.6) };
    });
    // Recomputed only when the underlying colours or era count change.
  }, [eraCount, tone, fg]);

  return (
    <>
      {rings.map(({ index, color }) => (
        <Ring
          key={index}
          index={index}
          distance={Math.abs(index - eraIndex)}
          color={color}
          segments={ringSegments}
          still={still}
        />
      ))}
    </>
  );
}

/**
 * Brightness is damped in the frame loop rather than driven from the React
 * prop, because the era changes in a single scroll tick: set straight from
 * props, every ring in the tunnel would step to its new level on one frame and
 * the whole background would flicker as the reader passes each card.
 */
function Ring({
  index,
  distance,
  color,
  segments,
  still,
}: {
  index: number;
  distance: number;
  color: THREE.Color;
  segments: number;
  still: boolean;
}) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const target = ringOpacity(distance);

  useFrame((_, delta) => {
    const current = material.current;
    // Under reduced motion the frame loop is on demand and only wakes when a
    // three.js prop actually changes — which a damp running in here is not. So
    // `still` hands the value back to React below rather than easing it.
    if (still || !current) return;

    current.opacity = THREE.MathUtils.damp(current.opacity, target, 4, delta);
  });

  return (
    <mesh position={[0, 0, -index * SPACING]}>
      <torusGeometry args={[RING_RADIUS, 0.02, 8, segments]} />
      {/*
        `0` while animating is an initial value the loop takes over on the
        first frame; React never re-applies an unchanged literal, so the two
        never fight over the same property.
      */}
      <meshBasicMaterial ref={material} color={color} transparent opacity={still ? target : 0} />
    </mesh>
  );
}

/** Scatters `count` points inside a cylinder around the z axis. */
function tunnelCloud(count: number, seed: number, length: number, radius: number): Float32Array {
  const rand = seededRandom(seed);
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const angle = rand() * Math.PI * 2;
    const r = radius * (0.35 + rand() * 0.65);
    positions[i * 3] = Math.cos(angle) * r;
    positions[i * 3 + 1] = Math.sin(angle) * r;
    positions[i * 3 + 2] = -rand() * length;
  }

  return positions;
}

const BASE_SPEED = 1.6;
const VELOCITY_BOOST = 5.5;

/**
 * A stream of motes flowing past the camera, wherever it currently sits in
 * the tunnel. Speed is scroll velocity, smoothed upstream by
 * `useScrollVelocity` — flick the page and the stream visibly accelerates.
 *
 * Each particle's position relative to the camera is tracked in `relZ`
 * (negative, growing toward 0) rather than recomputed from scratch every
 * frame; only the z component of the geometry buffer is rewritten, which is
 * the one thing that has to be, since a wrap-around stream cannot be done as
 * a rigid transform of the whole cloud the way the hero's ambient dust is.
 */
function ParticleField({
  count,
  length,
  still,
  velocity,
  color,
}: {
  count: number;
  length: number;
  still: boolean;
  velocity: MotionValue<number>;
  color: string;
}) {
  const cloud = useRef<THREE.Points>(null);
  const base = useMemo(
    () => tunnelCloud(count, 0x71de, length, RING_RADIUS * 1.4),
    [count, length],
  );
  const relZ = useRef<Float32Array>(new Float32Array(0));

  useEffect(() => {
    const next = new Float32Array(count);
    for (let i = 0; i < count; i += 1) next[i] = base[i * 3 + 2] ?? 0;
    relZ.current = next;
  }, [base, count]);

  useFrame(({ camera }, delta) => {
    if (still || count === 0 || !cloud.current) return;

    const attr = cloud.current.geometry.attributes.position;
    if (!(attr instanceof THREE.BufferAttribute)) return;

    const speed = BASE_SPEED + velocity.get() * VELOCITY_BOOST;
    const rel = relZ.current;

    for (let i = 0; i < count; i += 1) {
      let z = (rel[i] ?? 0) + delta * speed;
      if (z > 0) z -= length;
      rel[i] = z;
      attr.setZ(i, camera.position.z + z);
    }

    attr.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    // Culling is off because the cloud's bounding sphere is computed once from
    // the initial buffer and never recomputed: these points are rewritten to
    // follow the camera down the tunnel, so they travel well outside the box
    // Three still believes they occupy, and the whole field can wink out.
    <points ref={cloud} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[base, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.045}
        sizeAttenuation
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
