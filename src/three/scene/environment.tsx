"use client";

import { useMemo } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { sphericalCloud } from "@/lib/experience/random";

interface SceneEnvironmentProps {
  budget: SceneBudget;
  tone: string;
  toneSoft: string;
}

/**
 * The sparse background layer every section shares: fog to seat foreground
 * objects in real depth, and a slow, distant dust field. No focal geometry
 * lives here — each section-scene (Phases 2–7) owns its own object — this is
 * only the "subtle background detail" layer the spec asks for behind
 * everything else, kept deliberately quiet so it never competes.
 */
export function SceneEnvironment({ budget, tone, toneSoft }: SceneEnvironmentProps) {
  const count = Math.round(budget.particles * 0.4);

  // Seeded, not `Math.random()`: this field must not reshuffle on every tone
  // change, since only the material colour is meant to react to the section.
  const dust = useMemo(
    () => sphericalCloud(count, { seed: 3, inner: 6, outer: 14, flatten: 0.85 }),
    [count],
  );

  return (
    <>
      <fog attach="fog" args={[toneSoft, 8, 22]} />
      {count > 0 ? (
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[dust, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color={tone}
            size={0.015}
            sizeAttenuation
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      ) : null}
    </>
  );
}
