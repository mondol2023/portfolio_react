import { project } from "../core/camera";
import { hash1 } from "../core/num";
import { waterHeight } from "../core/water";
import type { World } from "../core/world";
import type { SpriteLayer } from "./layer";

const MAX = 90;
/** World units per second squared. Not real gravity — real gravity looks slow here. */
const GRAVITY = 16;

interface Drop {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  /** Seconds this drop lives. Fixed at birth so the fade is linear in `life`. */
  span: number;
  size: number;
}

/**
 * The crown of water thrown up where something hits the surface.
 *
 * The shader already answers "the surface is disturbed here" with a ripple.
 * This answers "something *hit* it", which is a different and much shorter
 * event — the difference between a splash and a wave, and the reason a tap
 * feels like contact rather than like a slider being moved.
 */
export function createSplashes(): SpriteLayer {
  // Pre-allocated pool. A dead drop is one with `life >= span`, so a burst
  // never allocates and the garbage collector never runs mid-animation.
  const drops: Drop[] = Array.from({ length: MAX }, () => ({
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 1,
    span: 1,
    size: 1,
  }));

  let cursor = 0;

  function emit(world: World, x: number, z: number, strength: number) {
    // A hard tap throws more water than a fish rising. Below a handful the
    // burst reads as dust rather than a splash, hence the floor.
    const count = Math.round(6 + strength * 16);
    const y = waterHeight(x, z, world.time, world.wind, world.ripples);

    for (let i = 0; i < count; i += 1) {
      const drop = drops[cursor % MAX];
      cursor += 1;
      if (!drop) continue;

      const seed = world.time * 91.7 + i * 3.3 + cursor;
      const angle = hash1(seed) * Math.PI * 2;
      // Biased outward and up: a splash is a crown, not a sphere.
      const out = (0.6 + hash1(seed * 1.9) * 1.8) * (0.5 + strength);
      const up = (2.2 + hash1(seed * 2.7) * 3.4) * (0.55 + strength * 0.8);

      drop.x = x;
      drop.y = y + 0.02;
      drop.z = z;
      drop.vx = Math.cos(angle) * out;
      drop.vy = up;
      drop.vz = Math.sin(angle) * out;
      drop.life = 0;
      drop.span = 0.4 + hash1(seed * 4.1) * 0.55;
      drop.size = 0.035 + hash1(seed * 5.5) * 0.05;
    }
  }

  return {
    order: 30,

    update(world) {
      // Only real contact throws water. Boat wakes and the gentlest drag-ripples
      // pass through this filter and disturb the surface without splashing.
      for (const impact of world.impacts) {
        if (impact.strength < 0.35) continue;
        emit(world, impact.x, impact.z, impact.strength);
      }

      const dt = world.dt;

      for (const drop of drops) {
        if (drop.life >= drop.span) continue;
        drop.life += dt;
        drop.vy -= GRAVITY * dt;
        drop.x += drop.vx * dt;
        drop.y += drop.vy * dt;
        drop.z += drop.vz * dt;

        // A drop that falls back through the surface is finished, whatever
        // time it had left. Water does not bounce.
        if (drop.y < 0) drop.life = drop.span;
      }
    },

    draw(ctx, world) {
      const { sky, light } = world;

      // Airborne water is mostly reflected sky, brightened — which is why a
      // splash is white at noon and grey-blue at dusk without any extra work.
      const r = Math.round(Math.min(1, sky.horizon[0] * 0.5 + 0.55) * 255);
      const g = Math.round(Math.min(1, sky.horizon[1] * 0.5 + 0.58) * 255);
      const b = Math.round(Math.min(1, sky.horizon[2] * 0.5 + 0.62) * 255);

      /*
       * A drop of water with the sun behind it is a lens. It does not merely
       * reflect the light, it concentrates it — which is why spray is the
       * brightest thing in a back-lit photograph of a river and why this glow
       * is added rather than blended.
       */
      const spark = light.keyStrength * light.backlit;
      const sparkR = Math.round(Math.min(1, light.key[0] * 0.6 + 0.4) * 255);
      const sparkG = Math.round(Math.min(1, light.key[1] * 0.6 + 0.4) * 255);
      const sparkB = Math.round(Math.min(1, light.key[2] * 0.6 + 0.4) * 255);

      for (const drop of drops) {
        if (drop.life >= drop.span) continue;

        const p = project(world.cam, drop.x, drop.y, drop.z, world.width, world.height);
        if (!p) continue;

        const radius = drop.size * p.pxPerUnit;
        if (radius < 0.35) continue;

        const fade = 1 - drop.life / drop.span;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${fade * 0.85})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();

        if (spark > 0.12 && radius > 0.7) {
          const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 4);
          halo.addColorStop(0, `rgba(${sparkR}, ${sparkG}, ${sparkB}, ${fade * spark * 0.5})`);
          halo.addColorStop(1, `rgba(${sparkR}, ${sparkG}, ${sparkB}, 0)`);

          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    },
  };
}
