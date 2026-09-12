import * as THREE from "three";

/**
 * Shared geometry factories for the persistent scene.
 *
 * Both exist so a section can build one geometry and hand it to every mesh
 * that needs it (`<mesh geometry={slab} dispose={null} />`) instead of letting
 * each mesh construct its own. With a five-project corridor that is the
 * difference between three geometries and fifteen.
 */

/**
 * A rounded, bevelled slab — the spec's "rounded geometry, bevels", which a
 * plain `boxGeometry` cannot give and drei's `<RoundedBox>` only gives per
 * mesh instance.
 *
 * Built as an extruded rounded rectangle rather than a subdivided cube: the
 * bevel then lands only on the silhouette edges, which is where it reads,
 * and the flat face stays two triangles.
 */
export function roundedSlabGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  bevelSegments = 2,
): THREE.ExtrudeGeometry {
  const r = Math.min(radius, width / 2, height / 2);
  const w = Math.max(width - r * 2, 0.001) / 2;
  const h = Math.max(height - r * 2, 0.001) / 2;

  const shape = new THREE.Shape();
  shape.moveTo(-w, -h - r);
  shape.lineTo(w, -h - r);
  shape.quadraticCurveTo(w + r, -h - r, w + r, -h);
  shape.lineTo(w + r, h);
  shape.quadraticCurveTo(w + r, h + r, w, h + r);
  shape.lineTo(-w, h + r);
  shape.quadraticCurveTo(-w - r, h + r, -w - r, h);
  shape.lineTo(-w - r, -h);
  shape.quadraticCurveTo(-w - r, -h - r, -w, -h - r);

  const bevel = Math.min(depth / 3, r / 2);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(depth - bevel * 2, 0.001),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: Math.max(1, bevelSegments),
    curveSegments: Math.max(3, bevelSegments * 3),
    steps: 1,
  });

  // Extrusion runs from z=0 forward; centring means a mesh's own position is
  // the slab's middle, so rotating it about its own axis behaves as expected.
  geometry.center();
  return geometry;
}

/**
 * The soft radial sprite the scene uses instead of a bloom pass.
 *
 * Real post-processing would mean a new dependency and a second full-screen
 * render for one accent; an additive sprite behind an emissive edge buys most
 * of the same read for one draw call. Cached at module scope because every
 * section wants the identical texture, and never disposed for the same
 * reason — it lives as long as the session does.
 */
let glow: THREE.CanvasTexture | null = null;

export function glowTexture(): THREE.CanvasTexture | null {
  if (glow) return glow;
  if (typeof document === "undefined") return null;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) return null;

  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.9)");
  gradient.addColorStop(0.28, "rgba(255, 255, 255, 0.32)");
  gradient.addColorStop(0.6, "rgba(255, 255, 255, 0.08)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  glow = new THREE.CanvasTexture(canvas);
  glow.colorSpace = THREE.SRGBColorSpace;
  return glow;
}
