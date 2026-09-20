"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { sphericalCloud } from "@/lib/experience/random";
import type { ScenePalette } from "@/lib/experience/scene-palette";
import { sceneTime } from "@/lib/experience/scene-timer";

import { SceneAtmosphere } from "./atmosphere";

interface SceneEnvironmentProps {
  budget: SceneBudget;
  palette: ScenePalette;
  reducedMotion: boolean;
}

/** One revolution of the far band roughly every nine minutes — present, never noticed. */
const DRIFT_SPEED = 0.012;
/** A slow vertical swell on top of the rotation, so the field is not a rigid turntable. */
const SWELL_SPEED = 0.08;
const SWELL_AMOUNT = 0.22;

/**
 * Three depth bands, not one cloud.
 *
 * The old field was one shell of 2,200 identical specks, which is a starfield
 * however it is coloured. Dust in a room is graded: the few motes near you are
 * large, dim and almost still, and the ones across the room are small, fainter
 * and the only ones you can see move at all. Three buffers is what buys that —
 * `pointsMaterial` carries a single size, and the one custom material Act II
 * has to spend is already spent on the atmosphere (D6).
 *
 * `speed` is a multiplier on `DRIFT_SPEED`. The near band's 0.1 is the point
 * of the whole arrangement: parallax against a far band that does move is what
 * makes the space read as deep.
 */
const BANDS = [
  { share: 0.22, seed: 3, inner: 2.6, outer: 6.5, size: 0.045, opacity: 1, speed: 0.1 },
  { share: 0.34, seed: 5, inner: 6.5, outer: 13, size: 0.028, opacity: 0.72, speed: 0.48 },
  { share: 0.44, seed: 9, inner: 13, outer: 22, size: 0.018, opacity: 0.45, speed: 1 },
] as const;

/**
 * The sparse background layer every section shares: the graded atmosphere that
 * seats foreground objects in real depth, and a slow dust field lying across
 * it. No focal geometry lives here — each section-scene owns its own object.
 *
 * The fog fades toward `palette.horizon` rather than the raw page colour, so
 * an object dissolving at distance arrives at the same value the atmosphere
 * shell is already painting at the eyeline. Before Phase 19 those were two
 * different colours: the far end of the corridor faded to flat `--bg` while
 * the background behind it was doing something else, which is the seam that
 * made the depth read as a veil hung over the page.
 */
export function SceneEnvironment({ budget, palette, reducedMotion }: SceneEnvironmentProps) {
  const count = budget.particles;

  // Seeded, not `Math.random()`: these must not reshuffle on every tone
  // change, since only the material colour is meant to react to the section.
  const bands = useMemo(
    () =>
      BANDS.map((band) => ({
        ...band,
        positions: sphericalCloud(Math.round(count * band.share), {
          seed: band.seed,
          inner: band.inner,
          outer: band.outer,
          flatten: 0.85,
        }),
      })),
    [count],
  );

  // Typed as the base class on purpose: only the transform is touched here, and
  // R3F's `Points` instance type does not match `THREE.Points`'s own default.
  const bandRefs = useRef<(THREE.Object3D | null)[]>([]);

  useFrame(() => {
    if (reducedMotion) return;

    // Driven from elapsed time rather than accumulated deltas so a tab that
    // was backgrounded resumes in the right place instead of jumping.
    const elapsed = sceneTime.elapsed;

    for (let index = 0; index < BANDS.length; index += 1) {
      const band = BANDS[index];
      const points = bandRefs.current[index];
      if (!band || !points) continue;

      points.rotation.y = elapsed * DRIFT_SPEED * band.speed;
      points.position.y = Math.sin(elapsed * SWELL_SPEED) * SWELL_AMOUNT * band.speed;
    }
  });

  return (
    <>
      <SceneAtmosphere palette={palette} budget={budget} reducedMotion={reducedMotion} />
      {/* Far enough back that nothing in a section's own composition is
          touched, close enough that the corridor's far end reads as distance.
          Projects is the deepest composition on the site and the one this is
          tuned for: its near panel sits inside the near plane untouched, the
          panels behind it lose a quarter and then a third of themselves to the
          horizon, and the wall the corridor ends in arrives about half
          dissolved — which is what makes it read as far away rather than
          small. */}
      <fog attach="fog" args={[palette.horizon, 7.5, 25]} />
      {count > 0
        ? bands.map((band, index) => (
            <points
              key={band.seed}
              ref={(instance) => {
                bandRefs.current[index] = instance;
              }}
            >
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[band.positions, 3]} />
              </bufferGeometry>
              {/* Additive light on a dark page is how dust actually behaves; on
                  a near-white page it adds to white and disappears, so there the
                  motes are drawn dark and composited normally instead.
                  Unfogged on purpose: depth here is carried by size, opacity and
                  drift rate, and letting the fog eat the far band as well would
                  double-count the same distance. */}
              <pointsMaterial
                color={palette.dark ? palette.accent : palette.deep}
                size={band.size}
                sizeAttenuation
                transparent
                opacity={(palette.dark ? 0.4 : 0.26) * band.opacity}
                blending={palette.dark ? THREE.AdditiveBlending : THREE.NormalBlending}
                depthWrite={false}
                fog={false}
              />
            </points>
          ))
        : null}
    </>
  );
}
