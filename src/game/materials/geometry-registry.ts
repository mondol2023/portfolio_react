import {
  BoxGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  ExtrudeGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  RingGeometry,
  Shape,
  TetrahedronGeometry,
  type BufferGeometry,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { FUSION } from "../config/game-config";
import { isFusedKind, partsOf } from "../config/fusion";
import { definitionFor } from "../config/shape-registry";

import type { BaseShapeKind, FusedShapeKind, ShapeKind } from "../types/game";

/**
 * Shared geometry registry — one GPU buffer per species for the whole world.
 *
 * Interactive shapes, fragments and the ambient field all draw from this
 * table; nothing ever constructs geometry at mount time. All base radii are
 * 1, so callers scale by a definition's `radius` and the registry stays
 * resolution-agnostic.
 *
 * Composite species (`fused:cube+crystal`) are built on first sight by welding
 * their ingredients' geometries into one buffer — see `buildFused` — and then
 * cached exactly like an authored one, so a fusion costs a single build no
 * matter how many of them end up floating in the world.
 */
const geometries = new Map<string, BufferGeometry>();

/** Five-point star profile for the extruded star species. */
function starProfile(points = 5, outer = 1, inner = 0.45): Shape {
  const shape = new Shape();
  for (let i = 0; i < points * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function buildBase(kind: BaseShapeKind): BufferGeometry {
  switch (kind) {
    case "cube":
      return new BoxGeometry(1.35, 1.35, 1.35);
    case "crystal":
      // Stretched octahedron reads as a raw crystal shard.
      return new OctahedronGeometry(1, 0).scale(0.85, 1.5, 0.85);
    case "stone":
      return new DodecahedronGeometry(1, 0);
    case "star":
      return new ExtrudeGeometry(starProfile(), { depth: 0.35, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 1 }).center();
    case "lantern":
      return new CylinderGeometry(0.62, 0.78, 1.3, 6);
    case "core":
      return new IcosahedronGeometry(1, 1);
  }
}

/**
 * Golden angle — the spacing that keeps successive parts as far from each
 * other as possible on a ring, so a three- or four-part fusion never lines up
 * into a stack or a flat row.
 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Welds a composite's ingredients into one buffer.
 *
 * Each part is scaled to its share of the result (`rᵢ / rTotal`, the same
 * volume arithmetic `composeFusedDefinition` uses for the radius), placed a
 * fraction of its own radius off-centre so the parts genuinely interpenetrate,
 * and given its own tilt so two cubes in one fusion don't read as a mirrored
 * pair. The union is then centred and rescaled to unit radius, which is what
 * lets a fused mesh keep using the same `scale = definition.radius` contract
 * — and keeps the silhouette inside the `BallCollider` sized against it.
 *
 * `mergeGeometries` needs every input to agree on indexing, so parts are
 * flattened to non-indexed first (the polyhedra already are; box, cylinder and
 * the extruded star are not).
 */
function buildFused(kind: FusedShapeKind): BufferGeometry {
  const parts = partsOf(kind);
  const total = definitionFor(kind).radius;
  const pieces: BufferGeometry[] = [];

  parts.forEach((part, index) => {
    const source = buildBase(part);
    const piece = source.index ? source.toNonIndexed() : source;
    if (piece !== source) source.dispose();

    const scale = total > 0 ? definitionFor(part).radius / total : 1;
    const angle = index * GOLDEN_ANGLE;
    const tilt = index * FUSION.partTilt;
    const spread = scale * FUSION.partOffset;

    piece.scale(scale, scale, scale);
    piece.rotateX(tilt * 0.6);
    piece.rotateY(angle);
    piece.rotateZ(tilt * 0.35);
    piece.translate(
      Math.cos(angle) * spread,
      Math.sin(angle * 1.7) * spread * FUSION.partRise,
      Math.sin(angle) * spread,
    );

    pieces.push(piece);
  });

  const merged = mergeGeometries(pieces, false);
  for (const piece of pieces) piece.dispose();

  // Mismatched attributes would be a programming error in `buildBase`, but a
  // failed weld must not take the frame loop with it.
  if (!merged) return buildBase(parts[0] ?? "cube");

  merged.center();
  merged.computeBoundingSphere();
  const bound = merged.boundingSphere?.radius ?? 0;
  if (bound > 0) merged.scale(1 / bound, 1 / bound, 1 / bound);
  merged.computeVertexNormals();
  merged.computeBoundingSphere();

  return merged;
}

/** The geometry for any species, authored or fused (cached, shared). */
export function getShapeGeometry(kind: ShapeKind): BufferGeometry {
  let geometry = geometries.get(kind);
  if (!geometry) {
    geometry = isFusedKind(kind) ? buildFused(kind) : buildBase(kind);
    geometries.set(kind, geometry);
  }
  return geometry;
}

export type AmbientSpecies = "shard" | "bird" | "lantern";

/**
 * Ambient species geometries: low-poly shards (distant crystals), paper birds
 * (two-wing tetrahedra read correctly at distance), far lanterns.
 */
export function getAmbientGeometry(species: AmbientSpecies): BufferGeometry {
  let geometry = geometries.get(`ambient:${species}`);
  if (!geometry) {
    geometry =
      species === "shard"
        ? new OctahedronGeometry(0.14, 0)
        : species === "bird"
          ? new TetrahedronGeometry(0.16, 0)
          : new CylinderGeometry(0.12, 0.16, 0.34, 6);
    geometries.set(`ambient:${species}`, geometry);
  }
  return geometry;
}

/** Thin unit ring (inner 0.8, outer 1) — impact meshes scale it up per `IMPACT_RINGS`. */
export function getImpactRingGeometry(): BufferGeometry {
  let geometry = geometries.get("impact:ring");
  if (!geometry) {
    geometry = new RingGeometry(0.8, 1, 32);
    geometries.set("impact:ring", geometry);
  }
  return geometry;
}

/** Frees every cached buffer — called only on module teardown (tests). */
export function disposeGeometries(): void {
  for (const geometry of geometries.values()) geometry.dispose();
  geometries.clear();
}
