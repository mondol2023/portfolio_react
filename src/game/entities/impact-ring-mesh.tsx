"use client";

import { useEffect, useMemo, useRef } from "react";
import { type Mesh } from "three";

import { getImpactRingGeometry } from "../materials/geometry-registry";
import { createImpactRingMaterial } from "../materials/material-registry";
import { registerImpactRingMesh, unregisterImpactRingMesh } from "../render/render-registry";

import type { ImpactRingEntity } from "../stores/impact-store";

/**
 * One shockwave ring: a static mesh whose scale and opacity `ImpactSystem`
 * drives directly through the render registry, same shape as `FragmentMesh`.
 * Its material is a fresh instance (see `createImpactRingMaterial`) disposed
 * on unmount — the one deliberate departure from this module's "share
 * everything" rule, because each ring fades on its own independent clock.
 */
export function ImpactRingMesh({ ring }: { ring: ImpactRingEntity }) {
  const meshRef = useRef<Mesh>(null);
  // Created once per mounted ring, not per render — a fresh instance each
  // render would fight the system's per-frame opacity writes and leak.
  const material = useMemo(() => createImpactRingMaterial(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.userData.entityId = ring.id;
    registerImpactRingMesh(ring.id, mesh);
    return () => {
      unregisterImpactRingMesh(ring.id);
      material.dispose();
    };
  }, [ring.id, material]);

  return (
    <mesh
      ref={meshRef}
      position={ring.position}
      scale={0.001}
      geometry={getImpactRingGeometry()}
      material={material}
    />
  );
}
