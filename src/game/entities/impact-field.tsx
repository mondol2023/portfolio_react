"use client";

import { useImpactStore } from "../stores/impact-store";
import { ImpactRingMesh } from "./impact-ring-mesh";

/**
 * Renders the live shockwave rings. Same contract as `FragmentField`: a mesh
 * per ring, React only involved when a ring spawns or expires. Mounted only
 * on mid/high budget tiers — see `world-composition.tsx` — the `low` tier
 * relies on the particle burst alone for impact feedback.
 */
export function ImpactField() {
  const rings = useImpactStore((state) => state.rings);

  return (
    <group>
      {[...rings.values()].map((ring) => (
        <ImpactRingMesh key={ring.id} ring={ring} />
      ))}
    </group>
  );
}
