import { project } from "../core/camera";
import { hash1 } from "../core/num";
import { waterHeight, waterSlope } from "../core/water";
import { spawnRipple } from "../core/world";
import { castShadow, css, tint, type SpriteLayer } from "./layer";

const COUNT = 5;
/** How far ahead a recycled boat is placed. */
const AHEAD = 120;

interface Boat {
  x: number;
  z: number;
  /** World units. A country boat is a long thin thing. */
  length: number;
  /** Its own speed relative to the water, so boats drift apart over time. */
  drift: number;
  /** Seeds the hull's proportions and its lantern's flicker. */
  seed: number;
  /** Smoothed roll angle, radians. Damped so it lags the wave that causes it. */
  roll: number;
  /** Metres of wake owed — a boat pushing along leaves ripples behind it. */
  wakeDebt: number;
}

function reseed(boat: Boat, z: number, seed: number): void {
  boat.seed = seed;
  boat.z = z;
  // Boats keep to the channel, not the banks, and never dead centre — a boat
  // exactly on the camera's axis reads as a target rather than a neighbour.
  const side = hash1(seed * 3.7) > 0.5 ? 1 : -1;
  boat.x = side * (5 + hash1(seed * 1.3) * 26);
  boat.length = 3.4 + hash1(seed * 2.1) * 3.2;
  boat.drift = -0.35 + hash1(seed * 5.9) * 0.9;
  boat.roll = 0;
  boat.wakeDebt = 0;
}

/**
 * The boats.
 *
 * This layer is the reason `core/water.ts` generates its own GLSL. Each hull's
 * height and roll are sampled from the same height field the shader is
 * shading, at the boat's own position, so a boat sits *in* the water rather
 * than on a screen-space approximation of it: it lifts on the swell the reader
 * can see arriving, and it rolls when a ripple they made reaches it.
 */
export function createBoats(): SpriteLayer {
  const boats: Boat[] = [];

  for (let i = 0; i < COUNT; i += 1) {
    const boat: Boat = { x: 0, z: 0, length: 0, drift: 0, seed: 0, roll: 0, wakeDebt: 0 };
    reseed(boat, 14 + i * 24, i * 17.7 + 3);
    boats.push(boat);
  }

  return {
    order: 20,

    update(world) {
      const dt = world.dt;

      for (const boat of boats) {
        boat.z += (world.flow + boat.drift) * dt;

        // Behind the camera, or so far ahead it is a speck: recycle it.
        const relative = boat.z - world.cam.z;
        if (relative < -6 || relative > AHEAD + 60) {
          reseed(boat, world.cam.z + AHEAD * (0.4 + hash1(boat.seed * 7.3) * 0.6), boat.seed + 13.1);
          continue;
        }

        // Roll follows the surface's cross-slope, damped so the hull has mass:
        // an undamped boat snaps to every ripple and reads as a sticker.
        const slope = waterSlope(boat.x, boat.z, world.time, world.wind, world.ripples);
        const target = Math.atan(slope.dx * 1.7);
        boat.roll += (target - boat.roll) * (1 - Math.pow(0.015, dt));

        // A moving hull leaves a wake. Charged by distance rather than time so
        // a boat that is barely moving does not spray ripples behind it.
        boat.wakeDebt += Math.abs(boat.drift) * dt;
        if (boat.wakeDebt > 1.6) {
          boat.wakeDebt = 0;
          spawnRipple(world, boat.x, boat.z - boat.length * 0.5, 0.12);
        }
      }
    },

    draw(ctx, world) {
      const { sky, light } = world;

      // Draw far boats first: painter's order, since nothing here writes depth.
      const ordered = [...boats].sort((a, b) => b.z - a.z);

      for (const boat of ordered) {
        const y = waterHeight(boat.x, boat.z, world.time, world.wind, world.ripples);
        const anchor = project(world.cam, boat.x, y, boat.z, world.width, world.height);
        if (!anchor) continue;

        const scale = anchor.pxPerUnit;
        if (scale < 0.8) continue;
        if (anchor.x < -300 || anchor.x > world.width + 300) continue;

        const len = boat.length * scale;
        const depth = len * 0.17;

        // Distant boats sit in the haze like everything else at that range.
        const haze = Math.min(1, Math.max(0, (110 - anchor.depth) / 70));
        const hull = css(
          [sky.fog[0] * 0.34, sky.fog[1] * 0.3, sky.fog[2] * 0.32],
          0.55 + haze * 0.42,
        );

        // The shadow goes down first, in world space, before the canvas is
        // rotated into the hull's own frame — a shadow lies on the water and
        // does not roll with the boat that casts it.
        castShadow(ctx, world, boat.x, boat.z, boat.length * 0.2, boat.length * 0.5, haze);

        ctx.save();
        ctx.translate(anchor.x, anchor.y);
        ctx.rotate(boat.roll);

        // Reflection: the hull again, upside down, dim and soft.
        ctx.save();
        ctx.globalAlpha = 0.22 * haze;
        ctx.scale(1, -1);
        ctx.fillStyle = hull;
        ctx.beginPath();
        ctx.moveTo(-len / 2, 0);
        ctx.quadraticCurveTo(0, depth * 2.4, len / 2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = hull;

        // Hull: a shallow crescent, pointed at both ends.
        ctx.beginPath();
        ctx.moveTo(-len / 2, 0);
        ctx.quadraticCurveTo(0, depth * 2.6, len / 2, 0);
        ctx.quadraticCurveTo(0, -depth * 0.5, -len / 2, 0);
        ctx.closePath();
        ctx.fill();

        /*
         * The lit edge.
         *
         * The sun in this scene is downstream, so every hull is seen against
         * its own light: the body goes to silhouette and the gunwale burns.
         * That single bright line is what separates the boat from the water
         * behind it — without it a back-lit hull is a hole in the picture.
         */
        const rim = light.keyStrength * (0.25 + 0.75 * light.backlit) * haze;

        if (rim > 0.04 && len > 6) {
          ctx.save();
          ctx.strokeStyle = css(tint(light.key, [1, 1, 1], 0.35), Math.min(0.95, rim));
          ctx.lineWidth = Math.max(0.7, len * 0.018);
          ctx.lineCap = "round";
          // Offset a hair toward the light, so the highlight sits on the edge
          // facing it rather than down the middle of the deck.
          ctx.translate(light.side * len * 0.008, -depth * 0.16);
          ctx.beginPath();
          ctx.moveTo(-len * 0.46, 0);
          ctx.quadraticCurveTo(0, -depth * 0.5, len * 0.46, 0);
          ctx.stroke();
          ctx.restore();
        }

        // A canopy on the bigger boats, and a standing figure poling on some.
        if (boat.length > 4.6) {
          const canopy = len * 0.34;
          ctx.beginPath();
          ctx.moveTo(-canopy * 0.6, 0);
          ctx.quadraticCurveTo(0, -canopy * 0.85, canopy * 0.6, 0);
          ctx.closePath();
          ctx.fill();

          // The crown of the canopy is the highest thing on the boat and the
          // first thing the light reaches.
          if (rim > 0.04 && canopy > 3) {
            ctx.save();
            ctx.strokeStyle = css(tint(light.key, [1, 1, 1], 0.25), Math.min(0.8, rim * 0.85));
            ctx.lineWidth = Math.max(0.6, canopy * 0.06);
            ctx.beginPath();
            ctx.moveTo(-canopy * (0.2 - light.side * 0.28), -canopy * 0.5);
            ctx.quadraticCurveTo(0, -canopy * 0.82, canopy * (0.2 + light.side * 0.28), -canopy * 0.5);
            ctx.stroke();
            ctx.restore();
          }
        } else if (hash1(boat.seed * 9.1) > 0.45) {
          const figure = len * 0.24;
          ctx.beginPath();
          ctx.rect(len * 0.22, -figure, Math.max(0.8, figure * 0.22), figure);
          ctx.fill();

          // The pole, angled into the water and swinging with a slow stroke.
          const stroke = Math.sin(world.time * 1.3 + boat.seed) * 0.35;
          ctx.strokeStyle = hull;
          ctx.lineWidth = Math.max(0.5, figure * 0.1);
          ctx.beginPath();
          ctx.moveTo(len * 0.22, -figure * 0.9);
          ctx.lineTo(len * 0.22 + Math.sin(stroke + 0.8) * figure * 2.2, figure * 0.9);
          ctx.stroke();
        }

        // Lanterns come on as the sun goes down, and flicker. This is the only
        // light in the scene the shader does not know about, so it is kept
        // small and warm rather than pretending to illuminate the water.
        if (sky.night > 0.05) {
          const flicker = 0.75 + 0.25 * Math.sin(world.time * 7 + boat.seed * 12);
          const glow = Math.max(1.4, len * 0.09);
          const lx = -len * 0.3;
          const ly = -depth * 0.6;

          const gradient = ctx.createRadialGradient(lx, ly, 0, lx, ly, glow * 6);
          gradient.addColorStop(0, `rgba(255, 208, 138, ${0.85 * sky.night * flicker})`);
          gradient.addColorStop(1, "rgba(255, 190, 120, 0)");

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(lx, ly, glow * 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(255, 233, 196, ${sky.night * flicker})`;
          ctx.beginPath();
          ctx.arc(lx, ly, glow, 0, Math.PI * 2);
          ctx.fill();

          /*
           * What the lantern does to the water under it: a pool of warm light
           * on the surface, and the long broken column of its reflection
           * running back toward the reader.
           *
           * Added rather than blended — light adds, it does not replace — and
           * kept short of the hull's own width, because a lantern that lights
           * the whole river reads as a bug rather than a lamp.
           */
          ctx.save();
          ctx.globalCompositeOperation = "lighter";

          const pool = ctx.createRadialGradient(lx, ly, 0, lx, ly, glow * 11);
          pool.addColorStop(0, `rgba(255, 186, 96, ${0.3 * sky.night * flicker})`);
          pool.addColorStop(1, "rgba(255, 150, 70, 0)");
          ctx.fillStyle = pool;
          ctx.save();
          // Flattened hard: the pool lies on the surface, so perspective
          // squashes it to a smear rather than a disc.
          ctx.translate(lx, ly);
          ctx.scale(1, 0.22);
          ctx.translate(-lx, -ly);
          ctx.beginPath();
          ctx.arc(lx, ly, glow * 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          const column = ctx.createLinearGradient(lx, ly, lx, ly + glow * 14);
          column.addColorStop(0, `rgba(255, 200, 120, ${0.34 * sky.night * flicker})`);
          column.addColorStop(1, "rgba(255, 170, 90, 0)");
          ctx.fillStyle = column;
          // Wobbles with the same swell that smears every other reflection.
          const sway = Math.sin(world.time * 2.1 + boat.seed) * glow * 0.5 * world.wind;
          ctx.beginPath();
          ctx.moveTo(lx - glow * 0.7, ly);
          ctx.lineTo(lx + glow * 0.7, ly);
          ctx.lineTo(lx + glow * 2.2 + sway, ly + glow * 14);
          ctx.lineTo(lx - glow * 2.2 + sway, ly + glow * 14);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        }

        ctx.restore();
      }
    },
  };
}
