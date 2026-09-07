import { horizonY } from "../core/camera";
import type { World } from "../core/world";
import { createBirds } from "./birds";
import { createBoats } from "./boats";
import { createFireflies } from "./fireflies";
import { css, type SpriteLayer } from "./layer";
import { createPaddy } from "./paddy";
import { createSkyline } from "./skyline";
import { createSplashes } from "./splashes";

export interface SpriteRendererOptions {
  /**
   * Paint a flat sky and river before the sprites.
   *
   * Only true when WebGL could not be created. The 2D fallback is a plain
   * gradient — no waves, no glitter — but it is the same palette from the same
   * day cycle, and the boats and birds still fly over it, so the scene degrades
   * to something quieter rather than to a blank rectangle.
   */
  fallbackSky: boolean;
}

export interface SpriteRenderer {
  resize(cssWidth: number, cssHeight: number, dpr: number, scale: number): void;
  render(world: World): void;
  dispose(): void;
}

/**
 * The 2D half: everything that is an object rather than a surface.
 *
 * Layers declare a painter's order and are sorted once at construction. The
 * bands do not overlap in depth — bank, then boats, then splashes on those
 * boats' water, then birds above, then fireflies, then the reeds in the
 * reader's lap — so a single ordering is enough and no per-object depth sort
 * across layers is needed.
 */
export function createSpriteRenderer(
  canvas: HTMLCanvasElement,
  { fallbackSky }: SpriteRendererOptions,
): SpriteRenderer | null {
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return null;

  // Re-bound to a non-nullable const so the draw closures below do not have to
  // re-check something that cannot be null by the time they run.
  const ctx: CanvasRenderingContext2D = context;

  const layers: SpriteLayer[] = [
    createSkyline(),
    createBoats(),
    createSplashes(),
    createBirds(),
    createFireflies(),
    createPaddy(),
  ].sort((a, b) => a.order - b.order);

  let ratio = 1;

  function resize(cssWidth: number, cssHeight: number, dpr: number, scale: number) {
    // Line art suffers from resolution loss far more than the shaded water
    // does, so the quality guard is allowed to take only a quarter here even
    // when it has halved the shader's resolution.
    ratio = Math.min(dpr, 2) * Math.max(scale, 0.75);

    const width = Math.max(1, Math.round(cssWidth * ratio));
    const height = Math.max(1, Math.round(cssHeight * ratio));

    if (canvas.width === width && canvas.height === height) return;

    canvas.width = width;
    canvas.height = height;
  }

  function drawFallbackSky(world: World) {
    const { sky } = world;
    const horizon = horizonY(world.cam, world.height);

    const above = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizon));
    above.addColorStop(0, css(sky.zenith));
    above.addColorStop(1, css(sky.horizon));
    ctx.fillStyle = above;
    ctx.fillRect(0, 0, world.width, Math.max(0, horizon));

    const below = ctx.createLinearGradient(0, horizon, 0, world.height);
    below.addColorStop(0, css(sky.fog));
    below.addColorStop(0.35, css(sky.waterDeep));
    below.addColorStop(1, css(sky.waterShallow));
    ctx.fillStyle = below;
    ctx.fillRect(0, Math.max(0, horizon), world.width, world.height - Math.max(0, horizon));
  }

  function render(world: World) {
    // Reset before clearing: the previous frame left a scale transform behind,
    // and clearing through it would miss the outermost row of device pixels.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    if (fallbackSky) drawFallbackSky(world);

    for (const layer of layers) layer.update(world);

    for (const layer of layers) {
      ctx.save();
      layer.draw(ctx, world);
      ctx.restore();
    }
  }

  function dispose() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Zero-sizing releases the backing store immediately rather than leaving a
    // full-screen bitmap alive until the canvas element is collected.
    canvas.width = 0;
    canvas.height = 0;
  }

  return { resize, render, dispose };
}
