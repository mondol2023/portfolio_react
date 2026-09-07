import { project } from "../core/camera";
import { hash1 } from "../core/num";
import { shadowOffset } from "../core/lighting";
import { waterHeight } from "../core/water";
import type { World } from "../core/world";
import { css, tint, type SpriteLayer } from "./layer";

const COUNT = 74;
/** Nearest and furthest a blade may stand from the camera. */
const NEAR_Z = 1.6;
const FAR_Z = 9;

/*
 * Where a blade stands sideways, as a multiple of how far away it is.
 *
 * Not an absolute X range, which is the obvious thing to write and the wrong
 * one: what decides whether a reed lands at the edge of the frame or straight
 * across the middle of the page's headline is the *ratio* x/z, because that is
 * what perspective divides by. A fixed range puts near blades at the edges and
 * far ones dead centre. Scaling with depth keeps the whole bed hugging the
 * frame — and as the camera closes on a blade its ratio grows, so it sweeps
 * outward and off the screen the way roadside grass does from a car window.
 */
const EDGE_MIN = 0.42;
const EDGE_MAX = 1.45;

interface Blade {
  x: number;
  z: number;
  /** World units tall. */
  height: number;
  /** Which way it leans at rest, radians. */
  lean: number;
  /** Its own sway phase, so the bank is not one keyframe. */
  phase: number;
  /** How far the pointer has pushed it, damped. Radians. */
  parted: number;
  seed: number;
}

function reseed(blade: Blade, world: World, seed: number): void {
  blade.seed = seed;
  const side = hash1(seed * 2.3) > 0.5 ? 1 : -1;
  const depth = NEAR_Z + hash1(seed * 3.7) * (FAR_Z - NEAR_Z);

  blade.z = world.cam.z + depth;
  blade.x = world.cam.x + side * depth * (EDGE_MIN + hash1(seed) * (EDGE_MAX - EDGE_MIN));
  blade.height = 0.55 + hash1(seed * 4.9) * 0.85;
  blade.lean = (hash1(seed * 5.3) - 0.5) * 0.5;
  blade.phase = hash1(seed * 6.7) * 10;
  blade.parted = 0;
}

/**
 * Reeds in the foreground, standing in the shallows either side of the channel.
 *
 * Their job is depth. The shader gives the scene distance but nothing very
 * close, and without something a metre from the lens rushing past, a moving
 * camera over open water is indistinguishable from a still one over moving
 * water. These blades are the parallax that settles which it is.
 *
 * They also part around the pointer, which is the cheapest possible physical
 * response and still the one people reach for first.
 */
export function createPaddy(): SpriteLayer {
  const blades: Blade[] = [];
  let seeded = false;

  return {
    order: 60,

    update(world) {
      if (!seeded) {
        seeded = true;
        for (let i = 0; i < COUNT; i += 1) {
          const blade: Blade = {
            x: 0,
            z: 0,
            height: 1,
            lean: 0,
            phase: 0,
            parted: 0,
            seed: i * 5.9 + 4,
          };
          reseed(blade, world, blade.seed);
          blades.push(blade);
        }
      }

      const dt = world.dt;

      for (const blade of blades) {
        // Pushed aside by the pointer, and springing back when it leaves. The
        // release is slower than the push, which is what makes it read as a
        // plant bending rather than a value being set.
        let target = 0;

        if (world.pointer.onWater) {
          const dx = blade.x - world.pointer.worldX;
          const dz = blade.z - world.pointer.worldZ;
          const d = Math.hypot(dx, dz);
          if (d < 4.5) {
            target = Math.sign(dx || 1) * (1 - d / 4.5) * 0.85;
          }
        }

        const rate = Math.abs(target) > Math.abs(blade.parted) ? 0.004 : 0.12;
        blade.parted += (target - blade.parted) * (1 - Math.pow(rate, dt));

        if (blade.z - world.cam.z < NEAR_Z - 1.0) reseed(blade, world, blade.seed + 31.7);
      }
    },

    draw(ctx, world) {
      const { sky, light } = world;

      // Foreground reeds are nearly black against everything behind them. They
      // are meant to frame the scene, not to be looked at.
      const ink = css([sky.fog[0] * 0.18, sky.fog[1] * 0.2, sky.fog[2] * 0.18], 0.9);

      /*
       * How hard the sun is edging them.
       *
       * A reed a metre from the lens with the sun behind it is not a black
       * line — it is a black line with a thread of fire down one side, because
       * the leaf is thin enough to glow. That thread is most of what makes the
       * foreground read as a foreground rather than as a smudge on the glass.
       */
      const rim = light.keyStrength * (0.3 + 0.7 * light.backlit);
      const rimInk = css(tint(light.key, [1, 1, 1], 0.3), Math.min(0.85, rim));
      const shadowInk = css(sky.waterDeep, light.shadowAlpha * 0.85);

      ctx.strokeStyle = ink;
      ctx.lineCap = "round";

      // Draw far blades first so near ones overlap them correctly.
      const ordered = [...blades].sort((a, b) => b.z - a.z);

      for (const blade of ordered) {
        const baseY = waterHeight(blade.x, blade.z, world.time, world.wind, world.ripples);
        const base = project(world.cam, blade.x, baseY, blade.z, world.width, world.height);
        if (!base) continue;
        if (base.x < -80 || base.x > world.width + 80) continue;

        // One gust crossing the bank, plus each blade's own phase. The X term
        // is what makes the wind travel across the reeds instead of hitting
        // them all at once.
        const gust =
          Math.sin(world.time * 1.6 + blade.phase + blade.x * 0.4) * 0.16 * world.wind +
          Math.sin(world.time * 3.7 + blade.phase * 2) * 0.05 * world.wind;

        const bend = blade.lean + gust + blade.parted;
        const h = blade.height * base.pxPerUnit;
        if (h < 3) continue;

        const tipX = base.x + Math.sin(bend) * h * 0.55;
        const tipY = base.y - Math.cos(bend) * h;

        /*
         * The blade's shadow, thrown flat across the water.
         *
         * Drawn as a line from the base to where the tip's shadow falls rather
         * than as a patch under the plant, because that is the shape that
         * carries the information: the reader reads the sun's height off how
         * far these stripes reach, without ever being told.
         */
        if (light.shadowAlpha > 0.02) {
          const reach = shadowOffset(light, blade.height * Math.cos(bend));
          const tipX3 = blade.x + reach.dx + Math.sin(bend) * blade.height * 0.55;
          const tipZ3 = blade.z + reach.dz;
          const tipY3 = waterHeight(tipX3, tipZ3, world.time, world.wind, world.ripples);
          const cast = project(world.cam, tipX3, tipY3, tipZ3, world.width, world.height);

          if (cast) {
            ctx.save();
            ctx.strokeStyle = shadowInk;
            ctx.lineWidth = Math.max(0.6, h * 0.018);
            ctx.beginPath();
            ctx.moveTo(base.x, base.y);
            ctx.lineTo(cast.x, cast.y);
            ctx.stroke();
            ctx.restore();
          }
        }

        ctx.lineWidth = Math.max(0.8, h * 0.022);
        ctx.beginPath();
        ctx.moveTo(base.x, base.y);
        ctx.quadraticCurveTo(
          base.x + Math.sin(bend) * h * 0.12,
          base.y - h * 0.55,
          tipX,
          tipY,
        );
        ctx.stroke();

        // The lit edge: the same curve again, a hair to the light's side and a
        // shade thinner, so it shows as a sliver rather than a second blade.
        if (rim > 0.05 && h > 14) {
          ctx.save();
          ctx.strokeStyle = rimInk;
          ctx.lineWidth = Math.max(0.5, h * 0.011);
          ctx.translate(light.side * Math.max(0.6, h * 0.013), 0);
          ctx.beginPath();
          ctx.moveTo(base.x, base.y - h * 0.1);
          ctx.quadraticCurveTo(
            base.x + Math.sin(bend) * h * 0.12,
            base.y - h * 0.55,
            tipX,
            tipY,
          );
          ctx.stroke();
          ctx.restore();
          ctx.strokeStyle = ink;
        }

        // A seed head on the taller ones. Without it a reed bed is just hatching.
        if (blade.height > 1.15) {
          ctx.lineWidth = Math.max(1.2, h * 0.05);
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX + Math.sin(bend) * h * 0.1, tipY - h * 0.12);
          ctx.stroke();

          // Seed heads are fluff, not stem: they catch far more light than the
          // blade does, and at dusk they are the brightest thing in the frame.
          if (rim > 0.05) {
            ctx.save();
            ctx.strokeStyle = css(tint(light.key, [1, 1, 1], 0.45), Math.min(0.9, rim * 1.15));
            ctx.lineWidth = Math.max(0.7, h * 0.026);
            ctx.beginPath();
            ctx.moveTo(tipX + light.side * h * 0.012, tipY);
            ctx.lineTo(
              tipX + Math.sin(bend) * h * 0.1 + light.side * h * 0.012,
              tipY - h * 0.12,
            );
            ctx.stroke();
            ctx.restore();
            ctx.strokeStyle = ink;
          }
        }
      }
    },
  };
}
