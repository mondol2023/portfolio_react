"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { easeOutCubic } from "@/lib/experience/scene-motion";

import { HERO_SCULPTURE_RADIUS } from "../../scene/geometry";
import { useHeroComposition, type HeroFormProps, type HeroTemperament } from "./composition";

/**
 * Garden — *alive*. A seed that has opened: a translucent pod ringed by
 * leaves, unfurling once on arrival and thereafter only leaning as the reader
 * scrolls.
 *
 * Deliberately free of wall-clock motion. Nothing here bobs on a `sin(time)`
 * with no scroll or hover tie (§13) — the opening is a one-shot emergence and
 * the lean is scrubbed by scroll position, which is what separates "settling"
 * from idle-game bobbing. The scenery's `timescale: 0.6` already makes every
 * remaining movement the slowest of the four.
 */
const TEMPERAMENT: HeroTemperament = {
  // Still. A plant does not spin; it grew where it is.
  idleSpeed: 0,
  breathAmount: 0,
  breathSeconds: 1,
  maxTilt: THREE.MathUtils.degToRad(6),
  // The most scroll rotation of the four: all of garden's motion is earned
  // from the reader rather than from a clock.
  scrollRotation: THREE.MathUtils.degToRad(80),
  // The longest emergence — unhurried is the whole brief.
  arriveSeconds: 2.4,
  // Pod radius plus an opened leaf's reach.
  halfExtent: 1.6,
};

const LEAF_COUNT = 7;
/**
 * Closed against the pod, and opened to a rosette.
 *
 * Not past horizontal: at 74° the leaves lie flat, the camera sees them
 * edge-on as slivers, and the whole form reads as a propeller rather than
 * something growing. Just under 50° keeps the faces turned toward the reader
 * and the silhouette upright.
 */
const LEAF_CLOSED = THREE.MathUtils.degToRad(6);
const LEAF_OPEN = THREE.MathUtils.degToRad(48);

/** A pointed ellipse — a leaf silhouette, flat and two-triangle-cheap. */
function leafShape(): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.34, 0.26, 0.4, 0.84, 0, 1.25);
  shape.bezierCurveTo(-0.4, 0.84, -0.34, 0.26, 0, 0);
  return shape;
}

export function OrganicHero(props: HeroFormProps) {
  const { tone, toneSoft, budget, reducedMotion } = props;
  const groupRef = useRef<THREE.Group>(null);
  const leafRefs = useRef<(THREE.Group | null)[]>([]);
  const leafMaterialRefs = useRef<(THREE.MeshPhysicalMaterial | null)[]>([]);
  const podRef = useRef<THREE.MeshPhysicalMaterial>(null);

  const leafGeometry = useMemo(() => new THREE.ShapeGeometry(leafShape(), budget.tier === "low" ? 6 : 12), [budget.tier]);
  useEffect(() => () => leafGeometry.dispose(), [leafGeometry]);

  /**
   * Real refraction is a second render pass, so it is spent only where the
   * device can afford it; below that the leaves still read as translucent
   * through opacity alone. A quantity that scales, not a feature switched off
   * (S11).
   */
  const transmission = budget.tier === "high" ? 0.85 : budget.tier === "mid" ? 0.45 : 0;

  useHeroComposition(groupRef, props, TEMPERAMENT, (frame) => {
    if (podRef.current) podRef.current.opacity = 0.55 * frame.columnPresence;

    // Emergence is eased; the lean that follows is linear in scroll, so the
    // reader feels they are driving it rather than watching a loop.
    const open = easeOutCubic(frame.arrive);
    const lean = frame.progress * 0.5;

    for (let index = 0; index < LEAF_COUNT; index += 1) {
      const leaf = leafRefs.current[index];
      const material = leafMaterialRefs.current[index];
      if (material) material.opacity = 0.78 * frame.columnPresence;
      if (!leaf) continue;

      // Each leaf opens slightly out of step with its neighbours — a fixed
      // per-leaf offset, not a running phase, so the stagger is in the
      // emergence and does not survive into a permanent wobble.
      const stagger = reducedMotion ? 1 : THREE.MathUtils.clamp(open * 1.4 - index * 0.05, 0, 1);
      // The azimuth now lives on the parent group, so the per-leaf lean is
      // weighted by the index the azimuth came from rather than by this
      // group's own (always zero) `rotation.y`.
      const azimuth = (index / LEAF_COUNT) * Math.PI * 2;
      leaf.rotation.x = THREE.MathUtils.lerp(LEAF_CLOSED, LEAF_OPEN, stagger) + lean * Math.cos(azimuth);
      leaf.scale.setScalar(THREE.MathUtils.lerp(0.4, 1, stagger));
    }
  });

  return (
    <group ref={groupRef}>
      {/* The pod: soft, translucent, and the only solid in the composition. */}
      <mesh>
        <sphereGeometry
          args={[HERO_SCULPTURE_RADIUS * 0.38, Math.max(16, budget.segments / 2), Math.max(12, budget.segments / 3)]}
        />
        <meshPhysicalMaterial
          ref={podRef}
          color={toneSoft}
          transparent
          opacity={0.55}
          roughness={0.5}
          metalness={0}
          transmission={transmission * 0.6}
          thickness={0.5}
        />
      </mesh>

      {Array.from({ length: LEAF_COUNT }, (_, index) => (
        // Two nested groups, not one Euler triple. Three's default `XYZ`
        // order applies Y *before* X, so a single `rotation={[tilt, azimuth,
        // 0]}` tilts every leaf about the same world axis instead of about
        // its own radial tangent: the rosette collapses and all but the
        // front leaf end up edge-on and invisible. The azimuth is fixed on
        // the outer group; the inner one owns the opening tilt alone.
        <group key={index} rotation={[0, (index / LEAF_COUNT) * Math.PI * 2, 0]}>
          <group
            ref={(group) => {
              leafRefs.current[index] = group;
            }}
            rotation={[LEAF_CLOSED, 0, 0]}
          >
            {/* Offset along its own axis so the leaf pivots from the pod's
                surface rather than from the world centre. */}
            <mesh geometry={leafGeometry} position={[0, HERO_SCULPTURE_RADIUS * 0.3, 0]} scale={1.05}>
              <meshPhysicalMaterial
                ref={(material) => {
                  leafMaterialRefs.current[index] = material;
                }}
                color={tone}
                side={THREE.DoubleSide}
                transparent
                opacity={0.78}
                roughness={0.62}
                metalness={0}
                transmission={transmission}
                thickness={0.25}
                // Leaves catch a soft sheen off the hemisphere bounce; without
                // it they read as flat paper cut-outs under diffuse light.
                sheen={0.6}
                sheenRoughness={0.7}
              />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}
