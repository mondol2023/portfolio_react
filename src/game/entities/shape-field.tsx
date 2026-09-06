"use client";

import { useShapeStore } from "../stores/shape-store";
import { ShapeMesh } from "./shape-mesh";

/**
 * Renders the interactive population.
 *
 * The component tree mirrors the shape store exactly: a mesh per entity, so
 * React work happens only when the *inventory* changes (spawn, merge, split,
 * collect) — never while shapes move. Motion is bodies + systems.
 */
export function ShapeField() {
  const entities = useShapeStore((state) => state.entities);

  return (
    <group>
      {[...entities.values()].map((entity) => (
        <ShapeMesh key={entity.id} entity={entity} />
      ))}
    </group>
  );
}
