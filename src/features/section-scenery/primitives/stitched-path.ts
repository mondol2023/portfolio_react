import { approach, between, clamp01, falloff } from "../engine/math";
import type { Scene } from "../engine/scene";
import { rgba, shade } from "../engine/tone-color";

/**
 * Dashed threads that draw themselves left to right, then keep travelling.
 *
 * A CV is a sequence, so the experience section gets the one primitive with a
 * direction and an order to it: the line arrives by being *written*, and once
 * written the stitches keep moving along it. Nothing else in the set has a
 * beginning and an end.
 *
 * **Its interaction is a pluck.** The pointer drags the nearest thread toward
 * itself in a local bell curve — one wire caught on a finger — and the thread
 * settles back when released. Only the nearest one or two respond, so the effect
 * is a specific line being touched rather than the whole field reacting.
 */
export interface StitchedPathOptions {
  rows?: number;
  /** Vertical span the rows occupy, as a fraction of height. */
  spread?: number;
  /** Wave height of each thread, as a fraction of height. */
  amplitude?: number;
  /** Dash length in CSS px. */
  dash?: number;
  /** Dash travel in px per second. */
  speed?: number;
  alpha?: number;
  /** Width of the pluck along the thread, as a fraction of viewport width. */
  grabWidth?: number;
  /** Furthest a thread is dragged toward the pointer, in CSS px. */
  grabDepth?: number;
}

interface Thread {
  y: number;
  phase: number;
  waves: number;
  dashOffset: number;
  drift: number;
  /** Fraction of the intro elapsed before this row starts drawing. */
  delay: number;
  /** 0 → 1: how much this thread is currently caught by the pointer. Eased, so
   *  it is picked up and let go rather than switched. */
  grab: number;
}

export function stitchedPath(options: StitchedPathOptions = {}): Scene {
  const {
    rows = 5,
    spread = 0.62,
    amplitude = 0.035,
    dash = 13,
    speed = 26,
    alpha = 1,
    grabWidth = 0.16,
    grabDepth = 46,
  } = options;

  const threads: Thread[] = Array.from({ length: rows }, (_, i) => ({
    y: rows === 1 ? 0.5 : 0.5 - spread / 2 + (i / (rows - 1)) * spread,
    phase: between(0, Math.PI * 2),
    waves: between(0.8, 1.6),
    dashOffset: between(0, dash * 2),
    drift: between(0.7, 1.3),
    delay: (i / rows) * 0.5,
    grab: 0,
  }));

  let width = 0;
  let height = 0;
  let step = 16;
  let samples = 0;
  /** Straight-line length of one thread. Close enough for the dash maths — the
   *  curve is barely longer than its chord at these amplitudes — and it saves
   *  walking the polyline every frame just to know how long it is. */
  let span = 0;
  /** Reused between rows and frames rather than reallocated per stroke. */
  let ys: number[] = [];

  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      step = Math.max(14, width / 64);
      samples = Math.ceil(width / step) + 2;
      ys = new Array<number>(samples).fill(0);
      span = width * 1.08;
    },

    frame({ ctx, dt, t, intro, palette, pointer }) {
      const amp = height * amplitude;
      const thread = shade(palette.tone, palette.dark ? 0.2 : -0.12);
      const sigma = Math.max(1, width * grabWidth);

      for (const row of threads) {
        const written = clamp01((intro - row.delay) / (1 - row.delay));
        if (written <= 0) continue;

        row.dashOffset -= speed * row.drift * dt;

        const base = height * row.y;
        // Only the threads the pointer is actually near are catchable. Without
        // this every row bends at once and it reads as the canvas warping.
        const nearRow = falloff(Math.abs(base - pointer.y), height * 0.16);
        const caught = nearRow * pointer.presence;
        row.grab = approach(row.grab, caught, caught > row.grab ? 0.18 : 0.65, dt);

        const drag = clamp01(Math.abs(pointer.y - base) / grabDepth);
        const pullY = Math.sign(pointer.y - base) * grabDepth * drag * row.grab;

        for (let i = 0; i < samples; i += 1) {
          const x = i * step;
          const along = (x - pointer.x) / sigma;
          // A bell curve along the thread: the pull is a point on a wire, not a
          // section of it lifted flat.
          const bell = Math.exp(-0.5 * along * along);
          ys[i] =
            base +
            Math.sin((x / width) * Math.PI * 2 * row.waves + row.phase + t * 0.18) * amp +
            pullY * bell;
        }

        // Quadratics through the midpoints. The pluck is a sharp local feature
        // and a polyline at this sampling distance would show its corners.
        ctx.beginPath();
        ctx.moveTo(0, ys[0] ?? base);
        for (let i = 1; i < samples - 1; i += 1) {
          const cx = i * step;
          const cy = ys[i] ?? base;
          ctx.quadraticCurveTo(cx, cy, (cx + (i + 1) * step) / 2, (cy + (ys[i + 1] ?? base)) / 2);
        }
        ctx.lineTo((samples - 1) * step, ys[samples - 1] ?? base);

        ctx.lineCap = "round";
        ctx.lineWidth = 1.4;

        if (written < 1) {
          // The draw-on: one dash the length of the whole line, walked into
          // frame from the left. When `written` hits 1 the line is complete and
          // this pass hands over to the travelling stitches below.
          ctx.setLineDash([span, span]);
          ctx.lineDashOffset = span * (1 - written);
          ctx.strokeStyle = rgba(thread, clamp01(0.4 * alpha));
          ctx.stroke();
        } else {
          // The finished thread, faint, so the stitches have something to sit on.
          ctx.setLineDash([]);
          ctx.strokeStyle = rgba(palette.soft, clamp01(palette.softAlpha * 1.6 * alpha));
          ctx.stroke();

          ctx.setLineDash([dash, dash * 1.4]);
          ctx.lineDashOffset = row.dashOffset;
          // A caught thread brightens along its whole length: the stitches on it
          // are what the reader is holding, so they should be legible.
          ctx.strokeStyle = rgba(thread, clamp01((0.42 + row.grab * 0.3) * alpha));
          ctx.stroke();
        }
      }

      // Left set, because the loop shares one context with every other primitive
      // in the composed scene.
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    },
  };
}
