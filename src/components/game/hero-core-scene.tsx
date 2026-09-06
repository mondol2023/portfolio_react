"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { sphericalCloud } from "@/lib/experience/random";
import { useMotionPreference } from "@/lib/hooks/use-motion-preference";

/**
 * The actual react-three-fiber scene behind `HeroCore`, split into its own
 * file so `next/dynamic` has something to code-split: `three` and
 * `@react-three/fiber` must never enter a Normal Mode bundle, and a dynamic
 * import only pulls in the module it points at, not its whole directory.
 */

interface HeroCoreSceneProps {
  active: boolean;
  budget: SceneBudget;
  pointer: { current: { x: number; y: number } };
  tone: string;
  toneSoft: string;
}

export function HeroCoreScene({ active, budget, pointer, tone, toneSoft }: HeroCoreSceneProps) {
  const reducedMotion = useMotionPreference();

  return (
    <Canvas
      dpr={[1, budget.maxDpr]}
      camera={{ position: [0, 0, 5.2], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      // Off-screen or backgrounded: stop the loop entirely rather than unmount,
      // so scrolling back to it resumes instead of rebuilding the buffers.
      // Reduced motion: render once ("demand") instead of looping — still, not slow.
      frameloop={!active ? "never" : reducedMotion ? "demand" : "always"}
    >
      <Core budget={budget} pointer={pointer} tone={tone} toneSoft={toneSoft} reducedMotion={reducedMotion} />
    </Canvas>
  );
}

interface CoreProps {
  budget: SceneBudget;
  pointer: { current: { x: number; y: number } };
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
}

function Core({ budget, pointer, tone, toneSoft, reducedMotion }: CoreProps) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);

  // Seeded, not `Math.random()`: a re-render must never reshuffle the cloud
  // mid-scene, and the server/client budget mismatch on first paint would
  // otherwise show up as a visible pop. See `random.ts`.
  const dust = useMemo(
    () => sphericalCloud(budget.particles, { seed: 7, inner: 1.8, outer: 3.2, flatten: 0.65 }),
    [budget.particles],
  );

  // The high tier's `postProcessing` budget has no bloom pass to spend it on
  // here (no post-processing package is installed) — it buys a second, denser
  // inner dust shell instead, which reads as "richer" without adding a
  // dependency for one scene.
  const halo = useMemo(
    () =>
      budget.postProcessing
        ? sphericalCloud(Math.round(budget.particles * 0.3), { seed: 11, inner: 1.1, outer: 1.6, flatten: 0.8 })
        : null,
    [budget.particles, budget.postProcessing],
  );

  useFrame((_state, delta) => {
    const current = group.current;
    if (!current || reducedMotion) return;

    current.rotation.y += delta * 0.12;
    // A slow bias rather than a snap: the core leans toward wherever the
    // pointer is, on top of its own constant spin.
    current.rotation.x = THREE.MathUtils.lerp(current.rotation.x, pointer.current.y * 0.15, 0.04);
    current.rotation.y += pointer.current.x * 0.0006;

    if (ring.current) ring.current.rotation.z -= delta * 0.2;
  });

  return (
    <group ref={group}>
      {/* Unlit materials throughout — no lights to compute means this scene
          is cheap even on the `low` tier it can land on. */}
      <mesh>
        <sphereGeometry args={[1, budget.segments, budget.segments]} />
        <meshBasicMaterial color={tone} wireframe transparent opacity={0.45} />
      </mesh>

      <mesh ref={ring} rotation={[Math.PI / 2.6, 0, 0]}>
        <torusGeometry args={[1.65, 0.015, 8, budget.segments]} />
        <meshBasicMaterial color={toneSoft} transparent opacity={0.55} />
      </mesh>

      {budget.particles > 0 ? (
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[dust, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color={toneSoft}
            size={0.02}
            sizeAttenuation
            transparent
            opacity={0.7}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      ) : null}

      {halo ? (
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[halo, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color={tone}
            size={0.015}
            sizeAttenuation
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      ) : null}
    </group>
  );
}
