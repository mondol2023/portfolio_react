import { project } from "../core/camera";
import { clamp01, hash1, smoothstep } from "../core/num";
import type { World } from "../core/world";
import type { RGB } from "../core/day-cycle";
import { css, reflectionWobble, tint, type SpriteLayer } from "./layer";

/**
 * How far to either side the banks sit, in world units.
 *
 * Wide enough to feel like a river rather than a canal, near enough that the
 * land is actually in frame: at 60-odd units the shore only enters the picture
 * beyond the fog distance, and all the reader ever sees of it is a hairline on
 * the horizon with huts apparently floating above it.
 */
const BANK_X = 44;
/** World units between one landmark and the next along a bank. */
const SPACING = 21;
/** Landmarks alive per bank. `COUNT * SPACING` is how far ahead the bank exists. */
const COUNT = 16;
/** The recycling stride: move a landmark this far forward and it is a new one. */
const SPAN = COUNT * SPACING;

type Kind = 0 | 1 | 2;

interface Landmark {
  x: number;
  z: number;
  kind: Kind;
  /** World units tall. */
  height: number;
  /** World units wide at the base. */
  width: number;
}

/** Re-seed a landmark in place from its new position. Shape follows location. */
function reseed(mark: Landmark, z: number, side: number): void {
  const seed = Math.abs(z) * 0.731 + (side > 0 ? 0 : 517);
  const roll = hash1(seed);

  // Mostly palms and huts, the occasional tower — a riverbank, not a skyline.
  mark.kind = roll > 0.88 ? 2 : roll > 0.46 ? 1 : 0;
  mark.z = z;
  // Always *outside* the bank line, never inside it: a hut halfway between the
  // shore and the channel is a hut standing in the river.
  mark.x = side * (BANK_X + 1 + hash1(seed * 1.7) * 18);
  mark.height = mark.kind === 2 ? 9 + hash1(seed * 3.3) * 12 : 3.6 + hash1(seed * 4.1) * 4.4;
  mark.width = mark.kind === 0 ? 0.45 : 2.2 + hash1(seed * 5.7) * 2.4;
}

/**
 * The far banks: silhouettes that recede into haze and reflect into the water,
 * generated rather than drawn.
 *
 * The camera travels downstream forever, so the bank has to as well. Each
 * landmark is recycled a fixed stride ahead once it passes behind the camera
 * and re-seeded from its new Z, so the bank never repeats visibly and never
 * costs more than `COUNT * 2` shapes however long the page is left open.
 */
export function createSkyline(): SpriteLayer {
  const marks: Landmark[] = [];

  for (const side of [1, -1]) {
    for (let i = 0; i < COUNT; i += 1) {
      const mark: Landmark = { x: 0, z: 0, kind: 0, height: 0, width: 0 };
      // Offset the far bank half a stride so the two sides do not march in step.
      reseed(mark, i * SPACING + (side > 0 ? 0 : SPACING * 0.5), side);
      marks.push(mark);
    }
  }

  function drawShape(
    ctx: CanvasRenderingContext2D,
    mark: Landmark,
    x: number,
    baseY: number,
    scale: number,
    /** 1 for the object, -1 for its mirror image. */
    flip: number,
    lean: number,
  ) {
    const h = mark.height * scale * flip;
    const w = Math.max(0.8, mark.width * scale);

    if (mark.kind === 0) {
      // Palm: a bending trunk and a spray of fronds. The lean comes from the
      // wind, so the bank sways with the gust that is roughening the water.
      const tipX = x + (w * 2.4 + h * 0.06) * lean;
      const tipY = baseY - h;

      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(x + (tipX - x) * 0.35, baseY - h * 0.6, tipX, tipY);
      ctx.lineWidth = Math.max(0.6, w * 0.55);
      ctx.stroke();

      const frond = Math.max(2, h * 0.34 * flip);
      ctx.lineWidth = Math.max(0.5, w * 0.35);

      for (let i = 0; i < 5; i += 1) {
        const a = -0.45 + i * 0.5;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.quadraticCurveTo(
          tipX + Math.cos(a) * frond * 0.7,
          tipY - frond * 0.35,
          tipX + Math.cos(a) * frond * 1.15,
          tipY + Math.sin(a) * frond * 0.6 + frond * 0.2,
        );
        ctx.stroke();
      }
      return;
    }

    if (mark.kind === 1) {
      // Hut: a box under a wide pitched roof with real eaves.
      ctx.beginPath();
      ctx.rect(x - w / 2, baseY - h * 0.55, w, h * 0.55);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x - w * 0.9, baseY - h * 0.48);
      ctx.lineTo(x, baseY - h);
      ctx.lineTo(x + w * 0.9, baseY - h * 0.48);
      ctx.closePath();
      ctx.fill();
      return;
    }

    // Tower: a tapering stack with a spire.
    ctx.beginPath();
    ctx.moveTo(x - w / 2, baseY);
    ctx.lineTo(x - w * 0.28, baseY - h * 0.8);
    ctx.lineTo(x, baseY - h);
    ctx.lineTo(x + w * 0.28, baseY - h * 0.8);
    ctx.lineTo(x + w / 2, baseY);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * The shoreline itself.
   *
   * Without it the landmarks are huts standing in open water: the shader's
   * water plane is infinite, so anything at y = 0 is *in* the river unless
   * something says otherwise. This is that something — a low strip of land
   * running down each side to the vanishing point, sampled at real depths so it
   * converges the way the rest of the scene does rather than being a painted
   * band across the canvas.
   *
   * Depths are spaced geometrically, not evenly: perspective compresses
   * distance, so equal steps in Z give a dense crowd of samples at the horizon
   * and a coarse, visibly faceted edge close by. Equal steps in *screen* space
   * is what geometric spacing approximates, for a handful of points.
   */
  function drawBank(ctx: CanvasRenderingContext2D, world: World, near: RGB) {
    const SAMPLES = 22;
    /** Average height of the land above the waterline, in world units. */
    const RISE = 0.95;
    /** Where haze starts eating the shore, and where it has finished. Matches
     *  the fog range in the water shader, so land and water dissolve together. */
    const FOG_NEAR = 35;
    const FOG_FAR = 210;

    for (const side of [1, -1]) {
      const x = side * BANK_X;
      const top: { x: number; y: number; depth: number }[] = [];
      const waterline: { x: number; y: number }[] = [];

      for (let i = 0; i < SAMPLES; i += 1) {
        // Geometric spacing, not linear: perspective compresses distance, so
        // equal steps in Z crowd the horizon and leave the near shore visibly
        // faceted. This approximates equal steps in screen space instead.
        const depth = 5 * Math.pow(560 / 5, i / (SAMPLES - 1));
        const z = world.cam.z + depth;

        /*
         * The crest wanders. A constant rise projects to a dead-straight edge,
         * and a dead-straight edge at this scale is not a riverbank, it is a
         * retaining wall. Two incommensurate sines keyed to world Z (not to the
         * sample index) mean the same stretch of shore keeps its shape however
         * far the camera has travelled.
         */
        const undulation =
          RISE * (0.72 + 0.34 * Math.sin(z * 0.11) + 0.16 * Math.sin(z * 0.037 + 2.1));

        const crest = project(world.cam, x, undulation, z, world.width, world.height);
        const foot = project(world.cam, x, 0, z, world.width, world.height);
        if (!crest || !foot) continue;

        top.push({ x: crest.x, y: crest.y, depth });
        waterline.push(foot);
      }

      const head = top[0];
      const tail = top[top.length - 1];
      if (!head || !tail || top.length < 3) continue;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(head.x, head.y);
      for (const point of top) ctx.lineTo(point.x, point.y);

      // Back along the waterline, then outward and down past the frame edge, so
      // the land reads as a mass continuing off-screen rather than a ribbon.
      for (let i = waterline.length - 1; i >= 0; i -= 1) {
        const point = waterline[i];
        if (point) ctx.lineTo(point.x, point.y);
      }
      ctx.lineTo(side > 0 ? world.width + 600 : -600, waterline[0]?.y ?? 0);
      ctx.lineTo(side > 0 ? world.width + 600 : -600, world.height + 600);
      ctx.lineTo(head.x, world.height + 600);
      ctx.closePath();

      /*
       * The far end has to dissolve, and the fade has to be keyed to *distance*
       * rather than to position along the gradient line. Those are not the same
       * thing: perspective packs everything from a hundred units out into the
       * last few pixels before the vanishing point, so a linear ramp across the
       * shape is almost entirely spent on land the reader can barely see, and
       * the part they can see stays flat. Placing one stop per sample, each at
       * that sample's real depth, puts the whole transition where it belongs.
       */
      const fade = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
      const runX = tail.x - head.x;
      const runY = tail.y - head.y;
      const runLength = runX * runX + runY * runY;
      let lastStop = -1;

      for (const point of top) {
        if (runLength <= 0) break;
        // Where this sample falls along the gradient line. Stops must be
        // non-decreasing, and a projection can repeat once the shore is edge-on.
        const along = clamp01(((point.x - head.x) * runX + (point.y - head.y) * runY) / runLength);
        if (along <= lastStop) continue;
        lastStop = along;

        const haze = smoothstep(FOG_NEAR, FOG_FAR, point.depth);
        fade.addColorStop(along, css(near, 0.95 * (1 - haze)));
      }

      ctx.fillStyle = fade;
      ctx.fill();

      /*
       * The lit crest.
       *
       * The top edge of the bank is the only part of it turned toward the sky,
       * so it is the only part with any light on it — a thread of brightness
       * where the land stops. It is a single stroke and it does more for the
       * shoreline than the whole silhouette beneath it: without it the bank is
       * a dark shape, with it the bank is a dark shape *with an edge*, which is
       * what the eye needs to read it as ground rather than as absence.
       */
      const glow = world.light.keyStrength * (0.3 + 0.7 * world.light.backlit);

      if (glow > 0.04) {
        ctx.beginPath();
        ctx.moveTo(head.x, head.y);
        for (const point of top) ctx.lineTo(point.x, point.y);

        const edge = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
        let last = -1;

        for (const point of top) {
          if (runLength <= 0) break;
          const along = clamp01(((point.x - head.x) * runX + (point.y - head.y) * runY) / runLength);
          if (along <= last) continue;
          last = along;
          const haze = smoothstep(FOG_NEAR, FOG_FAR, point.depth);
          edge.addColorStop(along, css(tint(world.light.key, [1, 1, 1], 0.3), glow * (1 - haze) * 0.8));
        }

        ctx.strokeStyle = edge;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  return {
    order: 10,

    update(world) {
      for (const mark of marks) {
        if (mark.z - world.cam.z < -25) {
          reseed(mark, mark.z + SPAN, mark.x >= 0 ? 1 : -1);
        }
      }
    },

    draw(ctx, world) {
      const { sky } = world;

      // Silhouettes are the fog colour pushed toward black. A distant object is
      // never truly dark — what we see is the haze in front of it.
      const outline = css(sky.fog, 0.95);
      const body = css(
        [sky.fog[0] * 0.62, sky.fog[1] * 0.6, sky.fog[2] * 0.66],
        0.94,
      );

      // How hard the light is edging the far bank. Back-lit landmarks — which
      // on this river is all of them, most of the day — take their shape from
      // this rather than from their own colour.
      const { light } = world;
      const rim = light.keyStrength * (0.25 + 0.75 * light.backlit) * 0.8;
      const lit = css(tint(light.key, [1, 1, 1], 0.2), 1);

      // One shared lean for the whole bank, so the wind is a single event
      // crossing the scene rather than each tree deciding for itself.
      const lean = 1 + Math.sin(world.time * 0.6) * 0.1 * world.wind;

      ctx.lineCap = "round";

      // The ground is darker than what stands on it: a bank is earth seen
      // edge-on, while the huts above it catch what light there is.
      drawBank(ctx, world, [sky.fog[0] * 0.4, sky.fog[1] * 0.4, sky.fog[2] * 0.44]);

      for (const mark of marks) {
        const base = project(world.cam, mark.x, 0, mark.z, world.width, world.height);
        if (!base) continue;
        if (base.x < -220 || base.x > world.width + 220) continue;

        const scale = base.pxPerUnit;
        // Below this the whole landmark is a pixel of noise on the horizon.
        if (scale < 0.35) continue;

        // Reflection first, underneath, dimmer and smeared by the swell.
        ctx.save();
        ctx.globalAlpha = 0.26;
        ctx.fillStyle = body;
        ctx.strokeStyle = body;
        ctx.translate(reflectionWobble(world, mark.x, base.depth), 0);
        drawShape(ctx, mark, base.x, base.y, scale * 0.94, -1, lean);
        ctx.restore();

        /*
         * The lit edge, drawn as the same silhouette shifted a hair toward the
         * sun and painted in the sun's own colour, with the body then laid on
         * top of it. What survives is a sliver down the light side — which is
         * exactly what a hut looks like at this distance with the sun behind
         * it, and it costs one extra fill rather than any notion of geometry.
         */
        if (rim > 0.05 && scale > 0.6) {
          const offset = Math.max(0.7, scale * 0.07);
          ctx.save();
          ctx.globalAlpha = Math.min(0.9, rim);
          ctx.fillStyle = lit;
          ctx.strokeStyle = lit;
          ctx.translate(light.side * offset, -offset * 0.6);
          drawShape(ctx, mark, base.x, base.y, scale, 1, lean);
          ctx.restore();
        }

        ctx.save();
        ctx.fillStyle = body;
        ctx.strokeStyle = outline;
        drawShape(ctx, mark, base.x, base.y, scale, 1, lean);
        ctx.restore();

        // A lamp inside, once it is dark enough to want one. The village is
        // the only warm light on the far bank, and a night shore with no lit
        // windows reads as abandoned rather than as distant.
        if (mark.kind === 1 && sky.night > 0.08 && scale > 1.1) {
          const flicker = 0.82 + 0.18 * Math.sin(world.time * 3.1 + mark.z);
          const lampY = base.y - mark.height * scale * 0.3;
          const size = Math.max(1.2, scale * 0.5);

          const halo = ctx.createRadialGradient(base.x, lampY, 0, base.x, lampY, size * 4);
          halo.addColorStop(0, `rgba(255, 198, 120, ${0.5 * sky.night * flicker})`);
          halo.addColorStop(1, "rgba(255, 170, 90, 0)");

          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(base.x, lampY, size * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    },
  };
}
