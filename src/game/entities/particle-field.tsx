"use client";

import { useEffect, useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, type Points } from "three";

import { getParticleMaterial } from "../materials/material-registry";
import { publishParticleGeometry } from "../particles/buffer-bridge";

import type { ParticleSimulation } from "../particles/simulation";

/**
 * The particle field: one `THREE.Points` bound straight to the pooled
 * simulation's buffers.
 *
 * No per-particle objects and no React re-renders — the simulation writes the
 * shared arrays; the particle system flips the attributes' `needsUpdate` and
 * the draw range each frame through the buffer bridge. GPU cost is a single
 * small draw call.
 */
export function ParticleField({ simulation }: { simulation: ParticleSimulation }) {
  const pointsRef = useRef<Points>(null);

  const geometry = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(simulation.positions, 3));
    geo.setAttribute("color", new BufferAttribute(simulation.colors, 3));
    geo.setDrawRange(0, 0);
    return geo;
  }, [simulation]);

  useEffect(() => {
    publishParticleGeometry(geometry);
    return () => publishParticleGeometry(null);
  }, [geometry]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return <points ref={pointsRef} geometry={geometry} material={getParticleMaterial()} frustumCulled={false} />;
}
