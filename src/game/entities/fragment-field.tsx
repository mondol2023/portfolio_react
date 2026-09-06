"use client";

import { useFragmentStore } from "../stores/fragment-store";
import { FragmentMesh } from "./fragment-mesh";

/**
 * Renders the split debris. Same contract as `ShapeField`: a mesh per
 * fragment, React only involved when fragments spawn or expire.
 */
export function FragmentField() {
  const fragments = useFragmentStore((state) => state.fragments);

  return (
    <group>
      {[...fragments.values()].map((fragment) => (
        <FragmentMesh key={fragment.id} fragment={fragment} />
      ))}
    </group>
  );
}
