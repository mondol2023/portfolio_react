import { project } from "../core/camera";
import type { RGB } from "../core/day-cycle";
import { shadowOffset } from "../core/lighting";
import { waterHeight } from "../core/water";
import type { World } from "../core/world";

/**
 * What every 2D layer is.
 *
 * `update` and `draw` are kept apart on purpose. All the simulation for the
 * frame happens first, so a bird startled by the pointer and the splash the
 * same pointer made are looking at the same instant; then everything draws in
 * depth order across layer boundaries would be nice, but painter's order per
 * layer is enough here because the layers occupy distinct depth bands.
 */
export interface SpriteLayer {
  /** Painter's order: lower numbers are further away and drawn first. */
  readonly order: number;
  update(world: World): void;
  draw(ctx: CanvasRenderingContext2D, world: World): void;
}

/** A colour triple as a canvas fill string. Alpha defaults to opaque. */
export function css(color: RGB, alpha = 1): string {
  const r = Math.round(color[0] * 255);
  const g = Math.round(color[1] * 255);
  const b = Math.round(color[2] * 255);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Darken toward black — silhouettes against a bright sky. */
export function shade(color: RGB, amount: number): RGB {
  return [color[0] * amount, color[1] * amount, color[2] * amount];
}

/**
 * How far a reflection is displaced sideways at a given depth.
 *
 * A mirror image on moving water does not sit still: it smears along the wave
 * crests. Sampling the real height field for this would be correct and also
 * invisible at reflection scale, so this is a cheap sine that costs nothing and
 * sells the same idea — the reflection wobbles, the object does not.
 */
export function reflectionWobble(world: World, worldX: number, depth: number): number {
  const t = world.time * 1.7;
  return (
    (Math.sin(worldX * 0.9 + t) * 0.6 + Math.sin(worldX * 2.3 - t * 1.4) * 0.4) *
    world.wind *
    Math.max(0.6, 6 / Math.max(1, depth))
  );
}

/** Lighten toward white — the lit edge of something the sun is behind. */
export function tint(color: RGB, toward: RGB, amount: number): RGB {
  return [
    color[0] + (toward[0] - color[0]) * amount,
    color[1] + (toward[1] - color[1]) * amount,
    color[2] + (toward[2] - color[2]) * amount,
  ];
}

/**
 * The shadow an object of a given height throws onto the water.
 *
 * Not decoration: a shadow is the only thing that says an object is *on* a
 * surface rather than floating in front of it. Everything in this scene stands
 * on water the shader draws and the sprite painter cannot touch, so this is
 * the one contact cue available, and it is worth its cost on every layer that
 * can afford it.
 *
 * The shape is a wide, flat ellipse because that is what a round shadow looks
 * like from a camera two metres above the surface it is lying on — and it is
 * drawn at the *displaced* height of the water where it lands, so a shadow
 * crossing a swell rides up and over it.
 */
export function castShadow(
  ctx: CanvasRenderingContext2D,
  world: World,
  x: number,
  z: number,
  /** How far above the water the object sits, in world units. */
  height: number,
  /** How wide the shadow is on the ground, in world units. */
  radius: number,
  /** Multiplier on the shadow's opacity — birds cast fainter ones than boats. */
  weight = 1,
): void {
  const { light } = world;
  const alpha = light.shadowAlpha * weight;
  if (alpha < 0.015) return;

  const { dx, dz } = shadowOffset(light, height);
  const sx = x + dx;
  const sz = z + dz;
  if (sz - world.cam.z < 0.4) return;

  const surface = waterHeight(sx, sz, world.time, world.wind, world.ripples);
  const spot = project(world.cam, sx, surface, sz, world.width, world.height);
  if (!spot) return;

  const rx = Math.max(1, radius * spot.pxPerUnit);
  // Foreshortening. Seen from near the surface, a circle on it is nearly a line.
  const ry = Math.max(0.6, rx * 0.3);

  // A shadow on water is not a dark stain; it is the same water with the sun
  // taken out of it, so it is the deep colour rather than black.
  const dark = world.sky.waterDeep;
  const soft = ctx.createRadialGradient(spot.x, spot.y, 0, spot.x, spot.y, rx);
  soft.addColorStop(0, css(dark, alpha));
  soft.addColorStop(0.55, css(dark, alpha * 0.55));
  soft.addColorStop(1, css(dark, 0));

  ctx.save();
  ctx.translate(spot.x, spot.y);
  ctx.scale(1, ry / rx);
  ctx.translate(-spot.x, -spot.y);
  ctx.fillStyle = soft;
  ctx.beginPath();
  ctx.arc(spot.x, spot.y, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
