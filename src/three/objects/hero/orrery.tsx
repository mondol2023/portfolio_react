"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";

import { sceneTime } from "@/lib/experience/scene-timer";

import { HERO_SCULPTURE_RADIUS } from "../../scene/geometry";
import { useHeroComposition, type HeroFormProps, type HeroTemperament } from "./composition";

/**
 * Observatory — *discovered*. An armillary: three gimbal rings turning around
 * a held core, under the one moving key (`scenery.lights.keyOrbit`) and the
 * cone that marks the core as a displayed object.
 *
 * Deep and deliberate rather than idle: the group itself barely turns, and
 * what motion there is belongs to the rings, each on its own orbital axis.
 * Nothing glows that a light is not casting (§4.2) — the metal is polished
 * and dark, and it reads as metal only because the key sweeps a specular
 * highlight across it.
 */
const TEMPERAMENT: HeroTemperament = {
  // Far slower than atelier's: the rings carry the motion, the mount does not.
  idleSpeed: (Math.PI * 2) / 48,
  // No breath. A brass instrument does not pulse.
  breathAmount: 0,
  breathSeconds: 1,
  maxTilt: THREE.MathUtils.degToRad(4),
  scrollRotation: THREE.MathUtils.degToRad(70),
  // The slowest arrival of the four: a slow spatial reveal, per Part 4.
  arriveSeconds: 1.6,
  // The outermost ring, plus its tube.
  halfExtent: 1.55,
};

interface RingSpec {
  radius: number;
  tube: number;
  /** Where the ring's own plane faces before it starts turning. */
  direction: THREE.Vector3;
  /** Orbit rate, rad/s — irrational ratios so the three never re-align. */
  speed: number;
  /** The pose it holds under reduced motion, radians. */
  restAngle: number;
}

const RINGS: readonly RingSpec[] = [
  { radius: 1.5, tube: 0.035, direction: new THREE.Vector3(0.2, 1, 0.1), speed: 0.11, restAngle: 0.4 },
  { radius: 1.18, tube: 0.03, direction: new THREE.Vector3(1, 0.35, -0.2), speed: -0.17, restAngle: 1.1 },
  { radius: 0.86, tube: 0.026, direction: new THREE.Vector3(-0.4, 0.6, 1), speed: 0.23, restAngle: 2.2 },
];

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const scratchQuaternion = new THREE.Quaternion();

/**
 * The axis a ring turns around: `cross(worldUp, direction)` — the horizontal
 * axis perpendicular to both "up" and the ring's own facing, so it sweeps
 * through the scene instead of spinning flat about Y. Same construction as
 * `lighting.tsx`'s `KEY_ORBIT_AXIS` (§9): quaternion from an axis, never
 * accumulated Euler angles.
 */
function orbitAxis(direction: THREE.Vector3): THREE.Vector3 {
  const axis = new THREE.Vector3().crossVectors(WORLD_UP, direction.clone().normalize());
  // Degenerate only if the ring faces straight up; fall back to X so the
  // cross product never hands back a zero-length axis.
  return axis.lengthSq() < 1e-6 ? new THREE.Vector3(1, 0, 0) : axis.normalize();
}

export function OrreryHero(props: HeroFormProps) {
  const { tone, toneSoft, budget, reducedMotion } = props;
  const groupRef = useRef<THREE.Group>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ringMaterialRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const coreRef = useRef<THREE.MeshStandardMaterial>(null);

  const axes = useMemo(() => RINGS.map((ring) => orbitAxis(ring.direction)), []);
  // The ring's own rest orientation, so its plane starts facing `direction`
  // rather than lying in XY and only being rotated from there.
  const basePose = useMemo(
    () => RINGS.map((ring) => new THREE.Quaternion().setFromUnitVectors(WORLD_UP, ring.direction.clone().normalize())),
    [],
  );

  useHeroComposition(groupRef, props, TEMPERAMENT, (frame) => {
    if (coreRef.current) coreRef.current.opacity = frame.columnPresence;

    for (let index = 0; index < RINGS.length; index += 1) {
      const spec = RINGS[index];
      const mesh = ringRefs.current[index];
      const axis = axes[index];
      const pose = basePose[index];
      if (!spec || !mesh || !axis || !pose) continue;

      const angle = reducedMotion ? spec.restAngle : sceneTime.elapsed * spec.speed;
      scratchQuaternion.setFromAxisAngle(axis, angle);
      mesh.quaternion.copy(scratchQuaternion).multiply(pose);

      const material = ringMaterialRefs.current[index];
      // The outermost ring sits furthest into the reading column, so it gives
      // way first — the core is the last thing to fade.
      if (material) material.opacity = frame.columnPresence * (1 - index * 0.12);
    }
  });

  return (
    <group ref={groupRef}>
      {/* The held core: dense, polished, small. The spot in `lighting.tsx`
          aims here, which is what reads as "displayed" rather than "lit". */}
      <mesh>
        <icosahedronGeometry args={[HERO_SCULPTURE_RADIUS * 0.42, budget.segments >= 32 ? 2 : 1]} />
        {/* Not fully metallic: with no environment map a `metalness: 1` body
            has nothing to reflect but the lights, so on atelier-white paper
            it renders as a black hole rather than as polished metal. Backing
            off to 0.75 keeps the travelling specular the orbiting key exists
            to produce while letting the hemisphere fill the body. */}
        <meshStandardMaterial ref={coreRef} color={toneSoft} roughness={0.22} metalness={0.75} transparent />
      </mesh>

      {RINGS.map((ring, index) => (
        <mesh
          key={ring.radius}
          ref={(mesh) => {
            ringRefs.current[index] = mesh;
          }}
        >
          {/* A thin ring needs resolution *around* the ring, not across the
              tube: at `budget.segments` tubular steps the silhouette breaks
              into visible straight runs and the instrument reads hand-drawn
              rather than precise. Radial steps stay low — nobody sees the
              cross-section of a 0.03 tube. */}
          <torusGeometry args={[ring.radius, ring.tube, 8, budget.tier === "low" ? 64 : 144]} />
          {/* Polished and near-neutral: colour comes from the key sweeping
              across it, not from the material carrying the accent itself. */}
          <meshStandardMaterial
            ref={(material) => {
              ringMaterialRefs.current[index] = material;
            }}
            color={index === 1 ? tone : toneSoft}
            roughness={0.18}
            metalness={1}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
}
