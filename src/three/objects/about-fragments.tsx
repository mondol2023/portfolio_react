"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import type { SceneBudget } from "@/lib/experience/device-tier";
import { seededRandom } from "@/lib/experience/random";

import { sceneScroll } from "@/lib/experience/scene-scroll";

import { heroShellSpin } from "./hero-sculpture";
import { sceneSectionEnvelope } from "../scene/camera-rig";
import { arcSlotPosition, fibonacciSpherePoints, HERO_SCULPTURE_RADIUS } from "../scene/geometry";

interface AboutFragmentsProps {
  tone: string;
  toneSoft: string;
  reducedMotion: boolean;
  budget: SceneBudget;
  /** This section's waypoint index: `entry` drives the scatter-to-reorganize, `exit` the condense-away. */
  sectionIndex: number;
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
const SHARD_UP = new THREE.Vector3(0, 1, 0);

function buildShards(shardCount: number): Shard[] {
  const random = seededRandom(11);
  const shellPoints = fibonacciSpherePoints(shardCount, HERO_SCULPTURE_RADIUS);
  const shards: Shard[] = [];

  for (let i = 0; i < shardCount; i += 1) {
    const { position, normal } = shellPoints[i]!;
    // Read straight off Hero's shell, not an independent scatter — this is
    // the same sphere breaking apart, so the start pose has to be its surface.
    const scattered = position.clone();
    const scatteredQuat = new THREE.Quaternion()
      .setFromUnitVectors(SHARD_UP, normal)
      .multiply(new THREE.Quaternion().setFromAxisAngle(normal, random() * Math.PI * 2));

    const arcT = shardCount === 1 ? 0 : i / (shardCount - 1) - 0.5;
    const target = arcSlotPosition(arcT);
    target.x += (random() - 0.5) * 0.15;
    target.y += (random() - 0.5) * 0.15;
    target.z += (random() - 0.5) * 0.2;
    // The two end shards drift forward instead of settling flush — they read
    // as passing in front of the heading rather than lining up behind it.
    if (i === 0 || i === shardCount - 1) {
      target.z += 0.75;
    }
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
  sectionIndex,
}: AboutFragmentsProps) {
  const shardCount = budget.tier === "low" ? 4 : 7;
  const shards = useMemo(() => buildShards(shardCount), [shardCount]);
  const outerRef = useRef<THREE.Group>(null);
  const shardRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame((_state, delta) => {
    const outer = outerRef.current;
    if (!outer) return;

    // Read per frame, not taken as a prop: scroll moves every frame, and
    // re-rendering the canvas at that rate is what `<ScrollPhysics>` avoids.
    const { entry: entryProgress, exit: exitProgress } = sceneSectionEnvelope(sceneScroll.progress, sectionIndex);

    const damp = reducedMotion ? 1 : 1 - Math.pow(0.001, delta);
    // Reduced motion: land fully formed immediately, no scatter-to-order
    // choreography — the cluster still legibly represents About, just static.
    // `appear` pops the cluster to full scale fast — it's already the whole
    // shell, breaking apart, not growing from nothing. `formAmount` is the
    // slower position/rotation lerp from shell to arc.
    const appear = reducedMotion ? 1 : THREE.MathUtils.smoothstep(entryProgress, 0, 0.12);
    const formAmount = reducedMotion ? 1 : THREE.MathUtils.smoothstep(entryProgress, 0.05, 0.95);
    const envelope = appear * (1 - THREE.MathUtils.smoothstep(exitProgress, 0, 1));

    shards.forEach((shard, index) => {
      const group = shardRefs.current[index];
      if (!group) return;

      scratchPos.lerpVectors(shard.scattered, shard.target, formAmount);
      group.position.lerp(scratchPos, damp);

      scratchQuat.slerpQuaternions(shard.scatteredQuat, shard.targetQuat, formAmount);
      group.quaternion.slerp(scratchQuat, damp);
    });

    // Carries Hero's live spin into the shell's break-up, dying out as the
    // shards finish settling into the arc — one motion, not a handoff cut.
    outer.rotation.y = heroShellSpin.angle * (1 - formAmount);
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
