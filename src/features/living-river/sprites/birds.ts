import { project } from "../core/camera";
import { clamp, hash1, TAU } from "../core/num";
import type { World } from "../core/world";
import { castShadow, css, tint, type SpriteLayer } from "./layer";

const COUNT = 14;
/** How far ahead the flock is re-formed once it falls behind. */
const AHEAD = 70;

interface Bird {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Wing phase, radians. Its own, so the flock is not one animation. */
  flap: number;
  /** Radians per second of flapping. Faster when climbing or startled. */
  flapRate: number;
  seed: number;
}

function reseed(bird: Bird, world: World, seed: number): void {
  bird.seed = seed;
  bird.x = world.cam.x + (hash1(seed) - 0.5) * 90;
  bird.y = 6 + hash1(seed * 2.3) * 14;
  bird.z = world.cam.z + AHEAD * (0.4 + hash1(seed * 3.1) * 0.9);
  bird.vx = (hash1(seed * 4.7) - 0.5) * 2;
  bird.vy = 0;
  bird.vz = -2 - hash1(seed * 5.3) * 3;
  bird.flap = hash1(seed * 6.1) * TAU;
  bird.flapRate = 7 + hash1(seed * 7.9) * 4;
}

/**
 * A flock of egrets working its way upstream.
 *
 * Three rules, the classic ones — pull toward the flock's centre, match its
 * heading, keep out of each other's way — which is enough to get the wheeling,
 * never-quite-repeating motion that scripted paths cannot fake. The fourth
 * rule is the reader: point at the water under a bird and it breaks away.
 *
 * It is O(n²), which for fourteen birds is 196 comparisons a frame — far
 * cheaper than the spatial index that would avoid them.
 */
export function createBirds(): SpriteLayer {
  const birds: Bird[] = [];
  let seeded = false;

  return {
    order: 40,

    update(world) {
      if (!seeded) {
        seeded = true;
        for (let i = 0; i < COUNT; i += 1) {
          const bird: Bird = {
            x: 0,
            y: 0,
            z: 0,
            vx: 0,
            vy: 0,
            vz: 0,
            flap: 0,
            flapRate: 8,
            seed: i * 11.3 + 1,
          };
          reseed(bird, world, bird.seed);
          birds.push(bird);
        }
      }

      const dt = world.dt;

      // Flock centre and average heading, computed once rather than per bird.
      let cx = 0;
      let cy = 0;
      let cz = 0;
      let hx = 0;
      let hy = 0;
      let hz = 0;

      for (const bird of birds) {
        cx += bird.x;
        cy += bird.y;
        cz += bird.z;
        hx += bird.vx;
        hy += bird.vy;
        hz += bird.vz;
      }

      cx /= COUNT;
      cy /= COUNT;
      cz /= COUNT;
      hx /= COUNT;
      hy /= COUNT;
      hz /= COUNT;

      for (const bird of birds) {
        // Cohesion, weak: birds should tend toward the flock, not collapse into it.
        bird.vx += (cx - bird.x) * 0.22 * dt;
        bird.vy += (cy - bird.y) * 0.22 * dt;
        bird.vz += (cz - bird.z) * 0.22 * dt;

        // Alignment.
        bird.vx += (hx - bird.vx) * 0.6 * dt;
        bird.vy += (hy - bird.vy) * 0.6 * dt;
        bird.vz += (hz - bird.vz) * 0.6 * dt;

        // Separation. Only close neighbours, and the push falls off sharply.
        for (const other of birds) {
          if (other === bird) continue;
          const dx = bird.x - other.x;
          const dy = bird.y - other.y;
          const dz = bird.z - other.z;
          const d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > 9 || d2 < 0.0001) continue;
          const push = (3.4 / d2) * dt;
          bird.vx += dx * push;
          bird.vy += dy * push;
          bird.vz += dz * push;
        }

        // Altitude band. Birds that stray get pulled back rather than clamped,
        // so the correction is part of the motion instead of a wall.
        if (bird.y < 5) bird.vy += (5 - bird.y) * 1.4 * dt;
        if (bird.y > 22) bird.vy += (22 - bird.y) * 1.4 * dt;

        // A little wander, uncorrelated per bird, so the flock never settles.
        bird.vx += Math.sin(world.time * 0.9 + bird.seed) * 0.35 * dt;
        bird.vy += Math.sin(world.time * 1.7 + bird.seed * 2.1) * 0.3 * dt;

        /*
         * Startle. The reader's pointer on the water is a thing on the ground
         * looking up; birds above it climb and scatter. This is the interaction
         * that most makes the scene feel alive, because it is the one where
         * something notices you rather than merely responding to you.
         */
        if (world.pointer.onWater) {
          const dx = bird.x - world.pointer.worldX;
          const dz = bird.z - world.pointer.worldZ;
          const d = Math.hypot(dx, dz);
          if (d < 16) {
            const fear = (1 - d / 16) * 9 * dt;
            bird.vx += (dx / Math.max(0.5, d)) * fear;
            bird.vz += (dz / Math.max(0.5, d)) * fear;
            bird.vy += fear * 0.8;
            bird.flapRate = 15;
          }
        }

        bird.flapRate += (8 - bird.flapRate) * 1.2 * dt;

        // Speed limit, applied to the vector rather than each axis, or fast
        // diagonal flight would be legal and fast straight flight would not.
        const speed = Math.hypot(bird.vx, bird.vy, bird.vz);
        const capped = clamp(speed, 2.4, 8);
        if (speed > 0.0001 && capped !== speed) {
          const k = capped / speed;
          bird.vx *= k;
          bird.vy *= k;
          bird.vz *= k;
        }

        bird.x += bird.vx * dt;
        bird.y += bird.vy * dt;
        bird.z += bird.vz * dt;

        // Wings beat harder on the climb, which is where the effort actually is.
        bird.flap += (bird.flapRate + Math.max(0, bird.vy) * 1.5) * dt;

        if (bird.z - world.cam.z < -12) reseed(bird, world, bird.seed + 29.3);
      }
    },

    draw(ctx, world) {
      const { light } = world;

      const ink = css(
        [world.sky.fog[0] * 0.28, world.sky.fog[1] * 0.26, world.sky.fog[2] * 0.3],
        1,
      );
      const rimInk = css(tint(light.key, [1, 1, 1], 0.4), Math.min(0.9, light.keyStrength));

      // Shadows first, all of them, before any bird is drawn: a shadow belongs
      // to the water, and a bird passing in front of another bird's shadow
      // should be in front of it.
      for (const bird of birds) {
        // Only the low, close ones. A bird twenty units up throws its shadow so
        // far downstream that the two stop reading as the same object, and the
        // shadow becomes a blob on the river with no cause.
        if (bird.y > 11) continue;
        if (bird.z - world.cam.z > 55) continue;
        castShadow(ctx, world, bird.x, bird.z, bird.y, 0.5, 0.55);
      }

      ctx.strokeStyle = ink;
      ctx.lineCap = "round";

      for (const bird of birds) {
        const p = project(world.cam, bird.x, bird.y, bird.z, world.width, world.height);
        if (!p) continue;
        if (p.x < -40 || p.x > world.width + 40) continue;

        const span = Math.max(1.5, p.pxPerUnit * 0.75);
        if (span < 1.6) continue;

        /*
         * The wingbeat is nearly the whole sprite: two strokes whose sweep is a
         * sine. The one detail worth adding is that the wings hinge *upward*
         * from the body — `-droop` at the shoulder, wingtips trailing behind —
         * because a symmetric curve through the body reads as a tilde, which is
         * exactly how a distant bird stops looking like a bird.
         */
        const beat = Math.sin(bird.flap);
        const droop = beat * span * 0.5;

        ctx.globalAlpha = Math.min(1, span / 3);
        ctx.lineWidth = Math.max(0.7, span * 0.18);

        /*
         * Sun through the wing.
         *
         * An egret's primaries are thin enough to pass light, so a back-lit
         * bird has a bright leading edge and a dark body — and the edge flares
         * on the downstroke, when the wing is broadside to the sun. That flare
         * is the whole reason the birds are worth having at this scale: it is
         * a moving highlight in a sky that is otherwise a gradient.
         */
        const flare = light.keyStrength * light.backlit * Math.max(0, beat);

        if (flare > 0.06 && span > 2.4) {
          ctx.save();
          ctx.strokeStyle = rimInk;
          ctx.globalAlpha = Math.min(1, span / 3) * Math.min(0.85, flare);
          ctx.lineWidth = Math.max(0.6, span * 0.1);
          ctx.translate(light.side * span * 0.06, -span * 0.06);
          ctx.beginPath();
          ctx.moveTo(p.x - span, p.y - droop);
          ctx.quadraticCurveTo(p.x - span * 0.45, p.y - droop * 0.15, p.x, p.y);
          ctx.quadraticCurveTo(p.x + span * 0.45, p.y - droop * 0.15, p.x + span, p.y - droop);
          ctx.stroke();
          ctx.restore();
          ctx.strokeStyle = ink;
        }

        ctx.beginPath();
        ctx.moveTo(p.x - span, p.y - droop);
        ctx.quadraticCurveTo(p.x - span * 0.45, p.y - droop * 0.15, p.x, p.y);
        ctx.quadraticCurveTo(p.x + span * 0.45, p.y - droop * 0.15, p.x + span, p.y - droop);
        ctx.stroke();

        // A body, once the bird is big enough for one to be more than a blob.
        if (span > 4) {
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, span * 0.16, span * 0.09, 0, 0, Math.PI * 2);
          ctx.fillStyle = ink;
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    },
  };
}
