"use client";

import { useEffect, useRef } from "react";
import { type Mesh } from "three";

import { definitionFor } from "../config/shape-registry";
import { getShapeGeometry } from "../materials/geometry-registry";
import { getFragmentMaterial } from "../materials/material-registry";
import { registerFragmentMesh, unregisterFragmentMesh } from "../render/render-registry";

import type { FragmentEntity } from "../types/game";

/**
 * One split fragment: a static mesh whose transform the split system drives
 * directly (position integration + shrink) through the render registry. No
 * physics body — fragments are echoes, not participants.
 */
export function FragmentMesh({ fragment }: { fragment: FragmentEntity }) {
  const meshRef = useRef<Mesh>(null);
  const definition = definitionFor(fragment.kind);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    mesh.userData.entityId = fragment.id;
    registerFragmentMesh(fragment.id, mesh);
    return () => unregisterFragmentMesh(fragment.id);
  }, [fragment.id]);

  return (
    <mesh
      ref={meshRef}
      position={fragment.position}
      scale={fragment.scale * definition.radius}
      geometry={getShapeGeometry(fragment.kind)}
      material={getFragmentMaterial()}
    />
  );
}
