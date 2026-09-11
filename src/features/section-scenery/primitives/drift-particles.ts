import { approach, between, clamp01, falloff } from "../engine/math";
import { createNoise2 } from "../engine/noise";
import type { Scene } from "../engine/scene";
import { rgba, shade } from "../engine/tone-color";

/**
 * A field of moving points, configured into two quite different things.
 *
 * With `streak` set and a strong downward speed it is rain — the drifting weather
 * over the experience timeline. With `damping` set and a twinkle it is fireflies
 * that rush in on arrival and settle almost still, which is what the contact
 * section closes on. Same twenty lines of integration either way, so there is one
 * place to fix a bug rather than two.
 *
 * The two configurations answer the reader differently, and deliberately so:
 * rain is *blown* sideways by a fast pointer, fireflies are *drawn toward* a slow
 * one and settle again once it moves on. Weather does not care about you; the
 * fireflies do.
 *
 * The motifs are the river kit's (`river-path/night-accents.ts`), not the code:
 * a `RiverLayer` is `{ css, mount(root) }` and hands out DOM nodes, so there is
 * nothing there a canvas can call.
 */
export interface DriftParticlesOptions {
  count?: number;
  /** Starting velocity range in CSS px per second. */
  speedX?: number;
  speedY?: number;
  /** Velocity retained per second. 1 keeps the particle moving forever; 0.05
   *  brings it almost to rest within a couple of seconds. */
  damping?: number;
  radius?: number;
  /** Drawn as a line covering this many seconds of travel instead of a dot. */
  streak?: number;
  /** 0 = steady, 1 = fully blinking. */
  twinkle?: number;
  alpha?: number;
  /** Fireflies only (`damping < 1`): how hard the pointer draws them in, px/s².
   *  Safe as a force here precisely because the damping sheds it again. */
  attraction?: number;
  /** Radius of that attraction, as a fraction of the viewport's smaller side. */
  attractionRadius?: number;
  /** Rain only (`streak > 0`): how much of the pointer's own sideways speed the
   *  weather picks up. */
  windiness?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  rate: number;
}

export function driftParticles(options: DriftParticlesOptions = {}): Scene {
  const {
    count = 46,
    speedX = 10,
    speedY = 10,
    damping = 1,
    radius = 1.8,
    streak = 0,
    twinkle = 0,
    alpha = 1,
    attraction = 60,
    attractionRadius = 0.3,
    windiness = 0.28,
  } = options;

  let dots: Particle[] = [];
  let width = 0;
  let height = 0;

  /** One field for the whole flock. Sampled at the particle's position, so two
   *  dots in different places wander differently — a per-particle sine gives
   *  every dot the same little circle, only offset, which the eye picks up. */
  const field = createNoise2();
  let wind = 0;

  function spawn(): Particle {
    return {
      x: between(0, width),
      y: between(0, height),
      vx: between(-speedX, speedX),
      vy: streak > 0 ? between(speedY * 0.7, speedY) : between(-speedY, speedY),
      r: between(radius * 0.6, radius),
      phase: between(0, Math.PI * 2),
      rate: between(0.6, 1.8),
    };
  }

  return {
    resize(nextWidth, nextHeight) {
      const first = width === 0;
      const previousWidth = width || nextWidth;
      const previousHeight = height || nextHeight;
      width = nextWidth;
      height = nextHeight;

      if (first) {
        dots = Array.from({ length: count }, spawn);
        return;
      }
      for (const dot of dots) {
        dot.x *= width / previousWidth;
        dot.y *= height / previousHeight;
      }
    },

    frame({ ctx, dt, t, intro, palette, pointer }) {
      // Framerate-independent decay. A plain `v *= damping` per frame would slow
      // particles twice as fast on a 120Hz display.
      const decay = damping >= 1 ? 1 : Math.pow(damping, dt);
      const bright = shade(palette.tone, palette.dark ? 0.35 : -0.2);

      // Applied to the drawn position rather than integrated into velocity: rain
      // is undamped, so a wind that accumulated would still be blowing sideways
      // ten seconds after the pointer stopped.
      wind = approach(wind, pointer.vx * windiness * pointer.presence, 0.5, dt);
      const gust = streak > 0 ? wind : 0;

      const pull = damping < 1 ? attraction * pointer.presence : 0;
      const reach = Math.min(width, height) * attractionRadius;

      for (const dot of dots) {
        dot.vx *= decay;
        dot.vy *= decay;

        if (damping < 1) {
          // Never quite still: a breath of wander keeps a settled firefly alive
          // instead of leaving a dead pixel on the page.
          dot.vx += field(dot.x * 0.004, t * 0.25 + dot.phase) * 8 * dt;
          dot.vy += field(dot.y * 0.004 + 31.7, t * 0.22 + dot.phase) * 8 * dt;

          if (pull > 0) {
            const dx = pointer.x - dot.x;
            const dy = pointer.y - dot.y;
            const distance = Math.hypot(dx, dy);
            const near = falloff(distance, reach);
            if (near > 0) {
              const length = Math.max(1, distance);
              dot.vx += (dx / length) * pull * near * dt;
              dot.vy += (dy / length) * pull * near * dt;
            }
          }
        }

        dot.x += (dot.vx + gust) * dt;
        dot.y += dot.vy * dt;

        if (dot.x < -20) dot.x = width + 20;
        else if (dot.x > width + 20) dot.x = -20;
        if (dot.y < -20) dot.y = height + 20;
        else if (dot.y > height + 20) dot.y = -20;

        const blink = 1 - twinkle * (0.5 + Math.sin(t * 1.9 * dot.rate + dot.phase) * 0.5);
        const strength = clamp01(0.55 * blink * intro * alpha);

        if (streak > 0) {
          ctx.beginPath();
          ctx.moveTo(dot.x, dot.y);
          ctx.lineTo(dot.x - (dot.vx + gust) * streak, dot.y - dot.vy * streak);
          ctx.strokeStyle = rgba(palette.tone, strength * 0.6);
          ctx.lineWidth = dot.r * 0.8;
          ctx.lineCap = "round";
          ctx.stroke();
          continue;
        }

        // Brighter the closer it is to the reader: the fireflies that came when
        // called should be the ones you can see.
        const held = pull > 0 ? falloff(Math.hypot(dot.x - pointer.x, dot.y - pointer.y), reach) : 0;
        const lit = clamp01(strength * (1 + held * 0.8));

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r * (1 + held * 0.35), 0, Math.PI * 2);
        ctx.fillStyle = rgba(bright, lit);
        ctx.fill();

        // A wider, fainter disc under the brightest ones. Two draws instead of a
        // shadow blur, which is an order of magnitude cheaper per frame.
        if (blink > 0.75 || held > 0.5) {
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.r * 3.4, 0, Math.PI * 2);
          ctx.fillStyle = rgba(palette.tone, lit * 0.12);
          ctx.fill();
        }
      }
    },
  };
}
