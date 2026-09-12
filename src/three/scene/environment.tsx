"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { sphericalCloud } from "@/lib/experience/random";
import type { ScenePalette } from "@/lib/experience/scene-palette";

interface SceneEnvironmentProps {
  budget: SceneBudget;
  palette: ScenePalette;
  reducedMotion: boolean;
}

/** One revolution of the dust field roughly every nine minutes — present, never noticed. */
const DRIFT_SPEED = 0.012;
/** A slow vertical swell on top of the rotation, so the field is not a rigid turntable. */
const SWELL_SPEED = 0.08;
const SWELL_AMOUNT = 0.22;

/**
 * The sparse background layer every section shares: atmosphere to seat
 * foreground objects in real depth, and a slow, distant dust field. No focal
 * geometry lives here — each section-scene owns its own object — this is only
 * the "subtle background detail" layer the spec asks for, kept deliberately
 * quiet so it never competes.
 *
 * The fog now fades toward the *page background* rather than the section
 * accent. Fog colour is what distance dissolves into, so tinting it with the
 * accent (as it was before `scene-palette.ts`, because `--tone-soft` arrives
 * here with its alpha stripped) hung a saturated haze over the whole world.
 * Fading toward `--bg` instead means the far end of a section genuinely
 * recedes into the page.
 */
export function SceneEnvironment({ budget, palette, reducedMotion }: SceneEnvironmentProps) {
  const count = Math.round(budget.particles * 0.4);

  // Seeded, not `Math.random()`: this field must not reshuffle on every tone
  // change, since only the material colour is meant to react to the section.
  const dust = useMemo(() => sphericalCloud(count, { seed: 3, inner: 6, outer: 16, flatten: 0.85 }), [count]);

  const fieldRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    const field = fieldRef.current;
    if (!field || reducedMotion) return;

    // Driven from elapsed time rather than accumulated deltas so a tab that
    // was backgrounded resumes in the right place instead of jumping.
    field.rotation.y = state.clock.elapsedTime * DRIFT_SPEED;
    field.position.y = Math.sin(state.clock.elapsedTime * SWELL_SPEED) * SWELL_AMOUNT;
  });

  return (
    <>
      {/* Far enough back that nothing in a section's own composition is
          touched, close enough that the corridor's far end reads as distance.
          Projects is the deepest composition on the site and the one this is
          tuned for: its near panel sits inside the near plane untouched, the
          panels behind it lose a quarter and then a third of themselves to the
          page colour, and the wall the corridor ends in arrives about half
          dissolved — which is what makes it read as far away rather than
          small. */}
      <fog attach="fog" args={[palette.atmosphere, 7.5, 25]} />
      {count > 0 ? (
        <points ref={fieldRef}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[dust, 3]} />
          </bufferGeometry>
          {/* Additive light on a dark page is how dust actually behaves; on a
              near-white page it adds to white and disappears, so there the
              motes are drawn dark and composited normally instead. */}
          <pointsMaterial
            color={palette.dark ? palette.accent : palette.deep}
            size={0.016}
            sizeAttenuation
            transparent
            opacity={palette.dark ? 0.4 : 0.26}
            blending={palette.dark ? THREE.AdditiveBlending : THREE.NormalBlending}
            depthWrite={false}
          />
        </points>
      ) : null}
    </>
  );
}
