/**
 * The camera, and the projection the two renderers agree on.
 *
 * The water is drawn by a fragment shader that fires a ray per pixel; the
 * boats, birds and reeds are drawn by a 2D canvas that needs to know where a
 * world point lands in pixels. Those are opposite directions through the same
 * lens, so both are written here, next to each other, derived from the same
 * three lines of ray construction — the alternative is a scene where the boats
 * drift a few degrees off the water they are supposed to be sitting on.
 *
 * Conventions: +X right, +Y up, +Z the way the camera looks (downstream). The
 * water is the plane Y = 0 and the camera floats a couple of units above it,
 * about the height of someone standing on a riverbank.
 */

export interface Camera {
  x: number;
  y: number;
  z: number;
  /** Radians. Positive looks right. */
  yaw: number;
  /** Radians. Positive looks up. */
  pitch: number;
  /** Half-height of the image plane at unit depth — smaller is a longer lens. */
  fov: number;
}

export interface Projected {
  /** Canvas pixels, origin top-left. */
  x: number;
  y: number;
  /** Distance along the view axis. Painter's-algorithm sort key. */
  depth: number;
  /** Canvas pixels per world unit at this depth — the sprite's scale. */
  pxPerUnit: number;
}

function rotateY(x: number, y: number, z: number, a: number): [number, number, number] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c + z * s, y, -x * s + z * c];
}

function rotateX(x: number, y: number, z: number, a: number): [number, number, number] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x, y * c + z * s, -y * s + z * c];
}

/**
 * World point → canvas pixel, or `null` when it is behind the lens.
 *
 * Rotations are applied in the reverse order and with the opposite sign to the
 * shader's (`rotY(yaw) * rotX(pitch) * ray`), which is what makes this its
 * exact inverse.
 */
export function project(
  cam: Camera,
  px: number,
  py: number,
  pz: number,
  width: number,
  height: number,
): Projected | null {
  const [ax, ay, az] = rotateY(px - cam.x, py - cam.y, pz - cam.z, -cam.yaw);
  const [bx, by, bz] = rotateX(ax, ay, az, -cam.pitch);

  // Anything at or behind the near plane has no meaningful screen position —
  // dividing by it would fling the sprite across the canvas instead.
  if (bz <= 0.08) return null;

  const aspect = width / height;
  const uvx = bx / bz / (aspect * cam.fov);
  const uvy = by / bz / cam.fov;

  return {
    x: (uvx * 0.5 + 0.5) * width,
    y: (0.5 - uvy * 0.5) * height,
    depth: bz,
    pxPerUnit: height / (2 * cam.fov * bz),
  };
}

/**
 * Canvas pixel → the point on the water it is looking at, or `null` above the
 * horizon.
 *
 * This is what turns a click into a ripple in the right place: the reader taps
 * a pixel, and the ripple has to appear at the spot on the river that pixel
 * shows, not at some screen-space approximation that slides as the camera
 * moves.
 */
export function unprojectToWater(
  cam: Camera,
  screenX: number,
  screenY: number,
  width: number,
  height: number,
): { x: number; z: number } | null {
  const aspect = width / height;
  const uvx = (screenX / width) * 2 - 1;
  const uvy = 1 - (screenY / height) * 2;

  const [ax, ay, az] = rotateX(uvx * aspect * cam.fov, uvy * cam.fov, 1, cam.pitch);
  const [dx, dy, dz] = rotateY(ax, ay, az, cam.yaw);

  // Rays aimed at or above the horizon never meet the plane — or meet it so
  // far away that the intersection is numerically meaningless.
  if (dy > -0.02) return null;

  const t = -cam.y / dy;
  return { x: cam.x + dx * t, z: cam.z + dz * t };
}

/**
 * The horizon's height in canvas pixels.
 *
 * Yaw cannot tilt it — rotating about Y leaves every ray's Y component alone —
 * so the horizon stays a level line and this is a single number rather than a
 * line equation. The 2D layer uses it to know where to mirror reflections.
 */
export function horizonY(cam: Camera, height: number): number {
  return (0.5 + Math.tan(cam.pitch) / (2 * cam.fov)) * height;
}
