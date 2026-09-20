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

/** Radius of Hero's glass sphere. Shared so About's fragments start on this
 * exact shell rather than an independently seeded cloud that merely looks similar. */
export const HERO_SCULPTURE_RADIUS = 1;

/**
 * Deterministic points spread evenly across a sphere's surface, plus each
 * point's outward normal.
 *
 * Phase 14's transformation handoffs need two objects to agree on a shape
 * without either file owning the other — Hero's shell breaking apart into
 * About's fragments is the first case. A Fibonacci lattice (the golden-angle
 * spiral) gives an even spread with no seed to keep in sync, unlike
 * `seededRandom`: the same `count` always returns the same points, which is
 * what lets a fragment's start position and rotation be *read from* the shell
 * instead of generated independently and hoping it lines up.
 */
export function fibonacciSpherePoints(
  count: number,
  radius: number,
): { position: THREE.Vector3; normal: THREE.Vector3 }[] {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const points: { position: THREE.Vector3; normal: THREE.Vector3 }[] = [];

  for (let i = 0; i < count; i += 1) {
    const y = count <= 1 ? 0 : 1 - (i / (count - 1)) * 2;
    const ringRadius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const normal = new THREE.Vector3(Math.cos(theta) * ringRadius, y, Math.sin(theta) * ringRadius);
    points.push({ position: normal.clone().multiplyScalar(radius), normal });
  }

  return points;
}

/**
 * The shallow, ordered arc About's fragments settle into — and the exact
 * shape Skills' galaxy starts from. `t` runs -0.5..0.5 across the arc's span.
 * Built once here so "fragments stop drifting and snap to lattice" is the
 * same curve on both sides of that boundary, not two authored shapes that
 * happen to read alike.
 */
export function arcSlotPosition(t: number): THREE.Vector3 {
  return new THREE.Vector3(t * 3.2, Math.sin(t * Math.PI) * 0.35, -0.6);
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

/**
 * A fine drafting grid, tiled by `repeat`/`offset` rather than baked at scene
 * scale — blueprint's plan sheets scroll it via `texture.matrix` in their own
 * `useFrame` (§4.4's Matrix3 UV animation), so the bitmap itself only has to
 * be one seamless tile. Cached at module scope for the same reason `glow` is:
 * every plan sheet and schematic backdrop wants the identical texture.
 */
let grid: THREE.CanvasTexture | null = null;

export function gridTexture(): THREE.CanvasTexture | null {
  if (grid) return grid;
  if (typeof document === "undefined") return null;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.strokeStyle = "rgba(255, 255, 255, 0.9)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, size - 0.5);
  context.lineTo(size, size - 0.5);
  context.moveTo(size - 0.5, 0);
  context.lineTo(size - 0.5, size);
  context.stroke();

  grid = new THREE.CanvasTexture(canvas);
  grid.colorSpace = THREE.SRGBColorSpace;
  grid.wrapS = THREE.RepeatWrapping;
  grid.wrapT = THREE.RepeatWrapping;
  // The consumer drives `matrix` directly (`matrixAutoUpdate = false`) so its
  // own `useFrame` can scroll the UVs without this module knowing about time.
  grid.matrixAutoUpdate = false;
  return grid;
}
