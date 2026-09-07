import { project } from "../core/camera";
import { hash1, TAU } from "../core/num";
import type { World } from "../core/world";
import type { SpriteLayer } from "./layer";

const COUNT = 40;
/** The box they wander in, relative to the camera. */
const SPREAD_X = 26;
const SPREAD_Z = 34;

interface Fly {
  x: number;
  y: number;
  z: number;
  /** Phase of its own blink. Fireflies are not a strobe; they are out of step. */
  blink: number;
  blinkRate: number;
  seed: number;
}

function reseed(fly: Fly, world: World, seed: number): void {
  fly.seed = seed;
  fly.x = world.cam.x + (hash1(seed) - 0.5) * SPREAD_X * 2;
  fly.y = 0.35 + hash1(seed * 2.7) * 2.6;
  fly.z = world.cam.z + 3 + hash1(seed * 3.9) * SPREAD_Z;
  fly.blink = hash1(seed * 5.1) * TAU;
  fly.blinkRate = 0.7 + hash1(seed * 6.3) * 1.1;
}

/**
 * Fireflies over the water after dark.
 *
 * Gated entirely on `sky.night`, so they are not a decoration bolted on top of
 * the day cycle — they arrive because it got dark, fade as it gets light, and
 * cost nothing at noon because the layer returns before doing any work.
 *
 * The motion is two sines per axis at incommensurate rates. That is far less
 * machinery than the flocking the birds get, and it is right for the subject:
 * a firefly's path has no destination in it.
 */
export function createFireflies(): SpriteLayer {
  const flies: Fly[] = [];
  let seeded = false;

  return {
    order: 50,

    update(world) {
      if (world.sky.night <= 0.02) return;

      if (!seeded) {
        seeded = true;
        for (let i = 0; i < COUNT; i += 1) {
          const fly: Fly = { x: 0, y: 0, z: 0, blink: 0, blinkRate: 1, seed: i * 7.7 + 2 };
          reseed(fly, world, fly.seed);
          flies.push(fly);
        }
      }

      const dt = world.dt;

      for (const fly of flies) {
        const s = fly.seed;

        fly.x += (Math.sin(world.time * 0.7 + s) + Math.sin(world.time * 1.9 + s * 3)) * 0.32 * dt;
        fly.y +=
          (Math.sin(world.time * 1.1 + s * 2) + Math.sin(world.time * 2.6 + s * 5)) * 0.22 * dt;
        // They hold station against the current rather than being swept away,
        // which is what an insect over a river actually does.
        fly.z += (Math.sin(world.time * 0.9 + s * 4) * 0.3 + world.flow * 0.82) * dt;

        // Never let one dive into the water or climb out of the scene.
        if (fly.y < 0.25) fly.y = 0.25;
        if (fly.y > 3.4) fly.y = 3.4;

        fly.blink += fly.blinkRate * dt;

        const relative = fly.z - world.cam.z;
        if (relative < 1.5 || relative > SPREAD_Z + 12) reseed(fly, world, fly.seed + 19.1);
        if (Math.abs(fly.x - world.cam.x) > SPREAD_X * 1.6) reseed(fly, world, fly.seed + 23.7);
      }
    },

    draw(ctx, world) {
      const night = world.sky.night;
      if (night <= 0.02 || flies.length === 0) return;

      ctx.globalCompositeOperation = "lighter";

      for (const fly of flies) {
        const p = project(world.cam, fly.x, fly.y, fly.z, world.width, world.height);
        if (!p) continue;
        if (p.x < -20 || p.x > world.width + 20) continue;

        // Sharp on, slow off — the shape of the actual flash, and the reason a
        // plain sine here reads as a pulsing dot rather than a living thing.
        const pulse = Math.pow(Math.max(0, Math.sin(fly.blink)), 6);
        const alpha = pulse * night;
        if (alpha < 0.02) continue;

        const radius = Math.max(0.9, p.pxPerUnit * 0.02);
        const glow = radius * 7;

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
        gradient.addColorStop(0, `rgba(214, 255, 168, ${alpha * 0.7})`);
        gradient.addColorStop(1, "rgba(160, 230, 110, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(240, 255, 214, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
    },
  };
}
