"use client";

import { useEffect, useRef } from "react";
import { RapierRigidBody, RigidBody, BallCollider } from "@react-three/rapier";
import { type Group, type Mesh } from "three";

import { definitionFor } from "../config/shape-registry";
import { getShapeGeometry } from "../materials/geometry-registry";
import { getShapeMaterial } from "../materials/material-registry";
import { registerBody, unregisterBody } from "../physics/body-registry";
import { registerShapeGroup, registerShapeMesh, unregisterShapeGroup, unregisterShapeMesh } from "../render/render-registry";

import type { ShapeEntity } from "../types/game";

/**
 * One interactive shape: a Rapier body + a shared geometry + a shared
 * material.
 *
 * Renders exactly when its entity enters the store and unmounts when it
 * leaves — the render loop reads transforms off the body, so nothing here
 * re-renders while a shape moves. Registration into the body and render
 * registries is what makes the entity visible to systems; both are cleaned
 * up on unmount, which is also how physics-side removals recycle cleanly.
 *
 * (Spawn velocities travel through the body-registry seed channel, set by
 * whoever adds the entity — before the store commit, so the body is born
 * already moving.)
 */
export function ShapeMesh({ entity }: { entity: ShapeEntity }) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const groupRef = useRef<Group>(null);
  const definition = definitionFor(entity.kind);

  useEffect(() => {
    const body = bodyRef.current;
    const group = groupRef.current;
    const mesh = group?.children[0] as Mesh | undefined;
    if (!body || !group || !mesh) return;

    registerBody(entity.id, body);
    mesh.userData.entityId = entity.id;
    registerShapeMesh(entity.id, mesh);
    registerShapeGroup(entity.id, group);

    return () => {
      unregisterBody(entity.id);
      unregisterShapeMesh(entity.id);
      unregisterShapeGroup(entity.id);
    };
  }, [entity.id]);

  return (
    <RigidBody
      ref={bodyRef}
      position={entity.position}
      colliders={false}
      linearDamping={0.4}
      angularDamping={0.6}
      ccd
    >
      <BallCollider args={[definition.radius]} />
      <group ref={groupRef} scale={definition.radius}>
        <mesh geometry={getShapeGeometry(entity.kind)} material={getShapeMaterial(entity.kind)} />
      </group>
    </RigidBody>
  );
}
