import type { Group, InstancedMesh, Mesh } from "three";

import type { EntityId } from "../types/game";

/**
 * The render-side twin of the body registry.
 *
 * Systems occasionally need to touch scene objects directly — hover feedback,
 * fragment scaling, instanced ambient motion — without React learning about
 * it. Meshes register here on mount and deregister on unmount; systems read
 * the maps imperatively inside the frame loop.
 */
const shapeMeshes = new Map<EntityId, Mesh>();
const shapeGroups = new Map<EntityId, Group>();
const fragmentMeshes = new Map<EntityId, Mesh>();
const impactRingMeshes = new Map<EntityId, Mesh>();
const instancedMeshes = new Map<string, InstancedMesh>();

export function registerShapeMesh(id: EntityId, mesh: Mesh): void {
  shapeMeshes.set(id, mesh);
}

export function unregisterShapeMesh(id: EntityId): void {
  shapeMeshes.delete(id);
}

export function shapeMeshList(): Mesh[] {
  return Array.from(shapeMeshes.values());
}

export function getShapeMesh(id: EntityId): Mesh | undefined {
  return shapeMeshes.get(id);
}

/**
 * The outer group each shape mesh sits inside — the mesh itself carries the
 * hover/merge scale pulse, so drag/throw squash-stretch rides on this
 * independent transform instead of fighting it.
 */
export function registerShapeGroup(id: EntityId, group: Group): void {
  shapeGroups.set(id, group);
}

export function unregisterShapeGroup(id: EntityId): void {
  shapeGroups.delete(id);
}

export function shapeGroupList(): Group[] {
  return Array.from(shapeGroups.values());
}

export function getShapeGroup(id: EntityId): Group | undefined {
  return shapeGroups.get(id);
}

export function registerFragmentMesh(id: EntityId, mesh: Mesh): void {
  fragmentMeshes.set(id, mesh);
}

export function unregisterFragmentMesh(id: EntityId): void {
  fragmentMeshes.delete(id);
}

export function getFragmentMesh(id: EntityId): Mesh | undefined {
  return fragmentMeshes.get(id);
}

export function registerImpactRingMesh(id: EntityId, mesh: Mesh): void {
  impactRingMeshes.set(id, mesh);
}

export function unregisterImpactRingMesh(id: EntityId): void {
  impactRingMeshes.delete(id);
}

export function getImpactRingMesh(id: EntityId): Mesh | undefined {
  return impactRingMeshes.get(id);
}

export function registerInstancedMesh(key: string, mesh: InstancedMesh): void {
  instancedMeshes.set(key, mesh);
}

export function unregisterInstancedMesh(key: string): void {
  instancedMeshes.delete(key);
}

export function instancedMeshList(): InstancedMesh[] {
  return Array.from(instancedMeshes.values());
}

/** Drops every reference — called when the world unmounts. */
export function clearRenderRegistry(): void {
  shapeMeshes.clear();
  shapeGroups.clear();
  fragmentMeshes.clear();
  impactRingMeshes.clear();
  instancedMeshes.clear();
}
