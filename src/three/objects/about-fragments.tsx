"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { seededRandom } from "@/lib/experience/random";

interface AboutFragmentsProps {
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  budget: SceneBudget;
  /** 0 at rest in Hero, 1 once the camera has fully arrived at About — drives the scatter-to-reorganize entrance. */
  entryProgress: number;
  /** 0 while resident in About, 1 once the camera has moved on toward Skills — drives the condense-away exit. */
  exitProgress: number;
}

interface Shard {
  scattered: THREE.Vector3;
  scatteredQuat: THREE.Quaternion;
  target: THREE.Vector3;
  targetQuat: THREE.Quaternion;
  scale: number;
  metal: boolean;
}

/**
 * Debris flung outward from where the Hero sphere sat, reorganizing into a
 * shallow, deliberate arc — order emerging from the same scatter, not a
 * second unrelated shape. Seeded once per count: this cluster's layout never
 * needs to change, only how gathered it is — and, per the spec's "deliberate
 * mobile composition, not a scaled-down desktop scene," how many shards make
 * it up at all on the lowest device tier.
 */
function buildShards(shardCount: number): Shard[] {
  const random = seededRandom(11);
  const shards: Shard[] = [];

  for (let i = 0; i < shardCount; i += 1) {
    const scatterRadius = 1.8 + random() * 1.6;
    const scatterTheta = random() * Math.PI * 2;
    const scatterPhi = Math.acos(2 * random() - 1);
    const scattered = new THREE.Vector3(
      scatterRadius * Math.sin(scatterPhi) * Math.cos(scatterTheta),
      scatterRadius * Math.cos(scatterPhi) * 0.7,
      scatterRadius * Math.sin(scatterPhi) * Math.sin(scatterTheta),
    );
    const scatteredQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2),
    );

    const arcT = shardCount === 1 ? 0 : i / (shardCount - 1) - 0.5;
    const target = new THREE.Vector3(arcT * 3.2, Math.sin(arcT * Math.PI) * 0.35 + (random() - 0.5) * 0.15, -0.6 + (random() - 0.5) * 0.2);
    const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, arcT * 0.6, 0));

    shards.push({
      scattered,
      scatteredQuat,
      target,
      targetQuat,
      scale: 0.26 + random() * 0.14,
      metal: i % 2 === 1,
    });
  }

  return shards;
}

const scratchPos = new THREE.Vector3();
const scratchQuat = new THREE.Quaternion();

/**
 * About's identity per the spec: a fragmentation/reorganization transition
 * carried over from the Hero object. Shards — the one primary object for
 * this section, seven of them on mid/high tiers, thinned to four on `low`
 * (phones) rather than just rendering the same seven smaller — start
 * scattered (as if flung from the Hero sphere) and settle into a shallow,
 * ordered arc as the camera arrives, then condense away (shrink, not
 * re-scatter — no abrupt resets) as it moves on to Skills. Mixed matte/metal
 * materials continue Hero's glass/metal contrast into the fragments
 * themselves.
 */
export function AboutFragments({
  tone,
  toneSoft,
  reducedMotion,
  budget,
  entryProgress,
  exitProgress,
}: AboutFragmentsProps) {
  const shardCount = budget.tier === "low" ? 4 : 7;
  const shards = useMemo(() => buildShards(shardCount), [shardCount]);
  const outerRef = useRef<THREE.Group>(null);
  const shardRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame((_state, delta) => {
    const outer = outerRef.current;
    if (!outer) return;

    const damp = reducedMotion ? 1 : 1 - Math.pow(0.001, delta);
    // Reduced motion: land fully formed immediately, no scatter-to-order
    // choreography — the cluster still legibly represents About, just static.
    const formAmount = reducedMotion ? 1 : THREE.MathUtils.smoothstep(entryProgress, 0.05, 0.95);
    const envelope = formAmount * (1 - THREE.MathUtils.smoothstep(exitProgress, 0, 1));

    shards.forEach((shard, index) => {
      const group = shardRefs.current[index];
      if (!group) return;

      scratchPos.lerpVectors(shard.scattered, shard.target, formAmount);
      group.position.lerp(scratchPos, damp);

      scratchQuat.slerpQuaternions(shard.scatteredQuat, shard.targetQuat, formAmount);
      group.quaternion.slerp(scratchQuat, damp);
    });

    outer.scale.setScalar(reducedMotion ? envelope : THREE.MathUtils.lerp(outer.scale.x, envelope, damp));
  });

  return (
    <group ref={outerRef} scale={0}>
      {shards.map((shard, index) => (
        <group
          key={index}
          ref={(node) => {
            shardRefs.current[index] = node;
          }}
        >
          <mesh scale={shard.scale}>
            <tetrahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={shard.metal ? tone : toneSoft}
              metalness={shard.metal ? 0.9 : 0.15}
              roughness={shard.metal ? 0.3 : 0.6}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
