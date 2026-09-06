"use client";

import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, InstancedMesh, Matrix4 } from "three";

import { WORLD_BOUNDS } from "../config/game-config";
import { getAmbientGeometry, type AmbientSpecies } from "../materials/geometry-registry";
import { registerInstancedMesh, unregisterInstancedMesh } from "../render/render-registry";
import { randRange, seededRandom } from "../utils/seeded";
import { useTonePalette } from "../config/palette";

/**
 * The decorative backdrop field — stars, paper birds, far lanterns.
 *
 * One `InstancedMesh` per species: the entire backdrop is three draw calls,
 * no matter the budget. Layout is generated once from a fixed seed, so the
 * field is identical every mount (no reshuffle pop), and the *motion* lives
 * in `AnimationSystem`, which rewrites instance matrices from the params
 * attached to each mesh's `userData`.
 */
export interface AmbientItem {
  x: number;
  y: number;
  z: number;
  scale: number;
  phase: number;
  bobSpeed: number;
  bobAmplitude: number;
  driftSpeed: number;
  driftAmplitude: number;
  spinSpeed: number;
  tumble: [number, number, number];
}

const SPECIES_MIX: ReadonlyArray<{ species: AmbientSpecies; share: number }> = [
  { species: "shard", share: 0.55 },
  { species: "bird", share: 0.25 },
  { species: "lantern", share: 0.2 },
];

export function AmbientField({ total }: { total: number }) {
  const palette = useTonePalette();
  const count = Math.max(0, total);

  const groups = useMemo(() => {
    const random = seededRandom(0x51ce);
    return SPECIES_MIX.map(({ species, share }) => {
      const speciesCount = Math.round(count * share);
      const items: AmbientItem[] = [];
      for (let i = 0; i < speciesCount; i += 1) {
        // Placed in a shell around the play volume: behind content, never
        // dead-centre where a shape is expected to float.
        const x = randRange(-WORLD_BOUNDS.x - 2, WORLD_BOUNDS.x + 2, random);
        const y = randRange(WORLD_BOUNDS.yBottom - 2, WORLD_BOUNDS.yTop + 2.5, random);
        const z = randRange(-WORLD_BOUNDS.z - 3.5, -WORLD_BOUNDS.z * 0.4, random);
        items.push({
          x,
          y,
          z,
          scale: randRange(0.7, 1.6, random),
          phase: random() * Math.PI * 2,
          bobSpeed: randRange(0.4, 1.1, random),
          bobAmplitude: randRange(0.08, 0.3, random),
          driftSpeed: randRange(0.15, 0.5, random),
          driftAmplitude: randRange(0.1, 0.5, random),
          spinSpeed: randRange(0.1, 0.5, random),
          tumble: [randRange(-1, 1, random), randRange(-1, 1, random), randRange(-1, 1, random)],
        });
      }
      return { species, items };
    });
  }, [count]);

  return (
    <group>
      {groups.map(({ species, items }) => (
        <AmbientGroup key={species} species={species} items={items} tone={palette.tone} toneSoft={palette.toneSoft} accent={palette.accent} />
      ))}
    </group>
  );
}

function AmbientGroup({
  species,
  items,
  tone,
  toneSoft,
  accent,
}: {
  species: AmbientSpecies;
  items: AmbientItem[];
  tone: string;
  toneSoft: string;
  accent: string;
}) {
  const meshRef = useRef<InstancedMesh>(null);

  const color = species === "bird" ? toneSoft : species === "lantern" ? accent : tone;
  const opacity = species === "bird" ? 0.8 : species === "lantern" ? 0.95 : 0.65;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Each instance starts exactly at its resting pose — the animation system
    // only ever composes offsets on top of these.
    const matrix = new Matrix4();
    items.forEach((item, index) => {
      matrix.makeTranslation(item.x, item.y, item.z);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.count = items.length;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.ambientItems = items;
    registerInstancedMesh(`ambient:${species}`, mesh);
    return () => unregisterInstancedMesh(`ambient:${species}`);
  }, [species, items]);

  return (
    <instancedMesh ref={meshRef} args={[getAmbientGeometry(species), undefined, Math.max(1, items.length)]} frustumCulled={false}>
      <meshBasicMaterial color={color} transparent opacity={opacity} blending={AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  );
}
