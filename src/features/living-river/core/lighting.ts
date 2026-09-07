import type { RGB, SkyState } from "./day-cycle";
import { clamp01, lerp, smoothstep } from "./num";
import type { Camera } from "./camera";

/**
 * One light, agreed on by everything that draws.
 *
 * The shader lights the water from `sky.sunDir`; the 2D layers light boats,
 * reeds and huts from this. If the two disagreed by so much as a sign, the
 * scene would come apart — a boat rim-lit on its left floating through water
 * whose crests are lit on their right is the kind of wrongness a reader feels
 * before they can name it. So the direction is taken from the same `SkyState`
 * the shader is handed, and everything else here is derived from it.
 *
 * The sun in this scene is always somewhat *ahead* of the camera (`sunDir.z`
 * is positive by construction in `day-cycle.ts`), which is a deliberate
 * choice and the source of most of the drama: the river is back-lit. Light
 * comes toward the reader off the water, objects sit as near-silhouettes with
 * a burning edge, and every shadow is cast toward the bottom of the frame,
 * where the reader is.
 */
export interface Lighting {
  /** Unit vector toward the dominant light — the sun, or the moon after dark. */
  dir: readonly [number, number, number];
  /** Its colour. */
  key: RGB;
  /** How much direct light there is at all. Near zero on a moonlit night. */
  keyStrength: number;
  /** What reaches the faces the key cannot see: sky bounce, not black. */
  ambient: RGB;
  /** The light's height in the sky, 0 on the horizon, 1 overhead. */
  altitude: number;
  /** How much the light faces the camera. 1 is straight into the lens. */
  backlit: number;
  /** +1 when the light is to the right of the camera's axis, -1 to the left. */
  side: number;
  /** How opaque a cast shadow on the water should be right now. */
  shadowAlpha: number;
  /** Ground distance a shadow travels per world unit of height. */
  shadowStretch: number;
}

/**
 * How far a shadow reaches, per unit of height.
 *
 * Geometrically this is `1 / dir.y`, which goes to infinity as the sun touches
 * the horizon. Real shadows do that too, and it is unusable: a hut's shadow
 * would sweep the entire river in the last seconds of the day. Clamped, so the
 * shadows lengthen convincingly through the evening and then stop.
 */
const MAX_STRETCH = 7;

/** Moonlight, for the hours when the sun is not the light. */
const MOON: RGB = [0.62, 0.68, 0.86];

export function sampleLighting(sky: SkyState, cam: Camera): Lighting {
  // After sunset the moon takes over as the thing casting shadows. The
  // crossfade is `night`, the same number that gates the stars, so the two can
  // never contradict each other.
  const night = sky.night;
  const sun = sky.sunDir;
  const moon = sky.moonDir;

  const dir: [number, number, number] = [
    lerp(sun[0], moon[0], night),
    lerp(sun[1], moon[1], night),
    lerp(sun[2], moon[2], night),
  ];

  const length = Math.hypot(dir[0], dir[1], dir[2]) || 1;
  dir[0] /= length;
  dir[1] /= length;
  dir[2] /= length;

  const key: RGB = [
    lerp(sky.sunTint[0], MOON[0], night),
    lerp(sky.sunTint[1], MOON[1], night),
    lerp(sky.sunTint[2], MOON[2], night),
  ];

  // The moon is roughly four hundred thousand times dimmer than the sun. Taken
  // literally that is no light at all, and the scene would go to flat black;
  // taken as 18% it reads as night to the eye, which is what the number is for.
  const keyStrength = sky.sunUp * (1 - night) + night * 0.18;

  const altitude = clamp01(dir[1]);

  // Which way the camera is facing, so "toward the light" can be resolved into
  // screen terms. Pitch is small enough here that the horizontal axis is all
  // that matters for the side test.
  const forwardX = Math.sin(cam.yaw);
  const forwardZ = Math.cos(cam.yaw);
  const rightX = Math.cos(cam.yaw);
  const rightZ = -Math.sin(cam.yaw);

  const backlit = clamp01(dir[0] * forwardX + dir[2] * forwardZ);
  const lateral = dir[0] * rightX + dir[2] * rightZ;

  return {
    dir,
    key,
    // The fill is the horizon's colour, dimmed. Surfaces turned away from the
    // sun are not black — they are lit by the whole sky, which at this hour is
    // whatever colour the horizon is.
    ambient: [sky.horizon[0] * 0.35, sky.horizon[1] * 0.35, sky.horizon[2] * 0.4],
    keyStrength,
    altitude,
    backlit,
    side: lateral >= 0 ? 1 : -1,
    // Shadows are weakest at the horizon (the light is grazing and the whole
    // world is in half-shadow anyway) and strongest with the sun well up.
    shadowAlpha: keyStrength * (0.14 + 0.4 * smoothstep(0.02, 0.55, altitude)),
    shadowStretch: Math.min(MAX_STRETCH, 1 / Math.max(1 / MAX_STRETCH, altitude)),
  };
}

/**
 * Where the shadow of a point `height` above the water lands, as an offset in
 * world units from the point's own position on the surface.
 *
 * The ray from the object away from the light meets `y = 0` after travelling
 * `height / dir.y` — the clamped form of which is `shadowStretch`.
 */
export function shadowOffset(light: Lighting, height: number): { dx: number; dz: number } {
  const reach = height * light.shadowStretch;
  return { dx: -light.dir[0] * reach, dz: -light.dir[2] * reach };
}
