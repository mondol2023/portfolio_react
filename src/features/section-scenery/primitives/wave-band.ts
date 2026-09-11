import { approach, between, clamp01 } from "../engine/math";
import { createNoise1, fbm1 } from "../engine/noise";
import type { Scene } from "../engine/scene";
import { rgba, shade } from "../engine/tone-color";

/**
 * Stacked swells crossing the viewport.
 *
 * The silhouette is entirely horizontal — long, low, unbroken. That is the point
 * of the greyscale test in the plan: strip the colour out and this still cannot
 * be confused with the stalks or the rails, because the *shape of the motion* is
 * different, not just the hue.
 *
 * **Its interaction is wind.** A quick move of the pointer raises the swell and
 * dies away slowly, and the stack slides against the pointer with the near bands
 * moving further than the far ones. Nothing here tracks the cursor directly —
 * the hero sits behind the largest type on the site and has to lose that fight
 * gracefully, so the reader gets weather, not a toy.
 */
export interface WaveBandOptions {
  bands?: number;
  /** Crest travel, as a fraction of viewport height. */
  amplitude?: number;
  /** Where the topmost band rests. 0 = top edge, 1 = bottom. */
  baseline?: number;
  /** Gap between bands, as a fraction of viewport height. */
  spread?: number;
  speed?: number;
  alpha?: number;
  /** How far the nearest band slides against the pointer, as a fraction of width. */
  parallax?: number;
  /** How much a fast pointer adds to the crest height, as a fraction of itself. */
  gust?: number;
}

interface Band {
  phase: number;
  /** Second, slower harmonic — keeps the crest from looking like a pure sine. */
  detune: number;
  drift: number;
  /** Its own noise stream, so no two bands wander together. */
  wander: (x: number) => number;
}

/** Pointer speed, in px per second, that counts as a full gust. About a brisk
 *  flick across a laptop screen. */
const GUST_SPEED = 900;

export function waveBand(options: WaveBandOptions = {}): Scene {
  const {
    bands = 4,
    amplitude = 0.055,
    baseline = 0.58,
    spread = 0.085,
    speed = 0.32,
    alpha = 1,
    parallax = 0.035,
    gust = 0.5,
  } = options;

  const rows: Band[] = Array.from({ length: bands }, () => ({
    phase: between(0, Math.PI * 2),
    detune: between(0.55, 0.85),
    drift: between(0.8, 1.25),
    wander: createNoise1(),
  }));

  let width = 0;
  let height = 0;
  /** Sampling step in CSS px. Coarser than it looks safe to be, because the
   *  crest is traced as quadratics through the midpoints below rather than as a
   *  polyline: fewer samples and a smoother curve at the same time. */
  let step = 20;
  let samples = 0;
  /** Reused across bands and frames. Allocating a few hundred numbers per band
   *  per frame is exactly the kind of garbage that shows up as a stutter every
   *  few seconds. */
  let ys: number[] = [];

  /** How much of a gust is currently in the air. Rises fast, falls slowly. */
  let wind = 0;

  return {
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      step = Math.max(14, width / 70);
      samples = Math.ceil(width / step) + 2;
      ys = new Array<number>(samples).fill(0);
    },

    frame({ ctx, dt, t, intro, palette, pointer }) {
      const target = clamp01(pointer.speed / GUST_SPEED) * pointer.presence;
      wind = approach(wind, target, target > wind ? 0.22 : 1.5, dt);

      const gap = height * spread;
      // The whole stack arrives from below rather than fading in place, so the
      // section change reads as water rising into frame.
      const lift = (1 - intro) * height * 0.3;

      let index = 0;
      for (const band of rows) {
        const depth = index / Math.max(1, bands - 1);
        // Near bands answer the pointer more than far ones. That difference is
        // the whole illusion of depth here — a uniform slide would just look
        // like the canvas moving.
        const near = 1 - depth * 0.65;
        const slide = -pointer.nx * width * parallax * near;
        const amp = height * amplitude * (1 + wind * gust * near);
        const base =
          height * baseline + gap * index + lift + pointer.ny * height * parallax * 0.5 * near;
        const wavelength = (Math.PI * 2) / (width * (0.85 + depth * 0.5));

        for (let i = 0; i < samples; i += 1) {
          const x = i * step + slide;
          ys[i] =
            base +
            Math.sin(x * wavelength + t * speed * band.drift + band.phase) * amp +
            Math.sin(x * wavelength * 2.3 - t * speed * band.detune) * amp * 0.35 +
            // The irregular part. Without it five bands of two sines each still
            // read as five bands of two sines each.
            fbm1(band.wander, x * 0.0022 + t * 0.09) * amp * 0.4;
        }

        // The crest is traced once and reused for both passes. Stroking the
        // filled path instead would draw a line down the sides and along the
        // bottom edge of the viewport, which is not a wave.
        const crest = () => {
          ctx.beginPath();
          ctx.moveTo(0, ys[0] ?? base);
          // Quadratics through the midpoints: each sample becomes a control
          // point rather than a corner, so the curve is continuous instead of
          // faceted, and it stays smooth even at this sampling distance.
          for (let i = 1; i < samples - 1; i += 1) {
            const cx = i * step;
            const cy = ys[i] ?? base;
            const nx = (cx + (i + 1) * step) / 2;
            const ny = (cy + (ys[i + 1] ?? base)) / 2;
            ctx.quadraticCurveTo(cx, cy, nx, ny);
          }
          ctx.lineTo((samples - 1) * step, ys[samples - 1] ?? base);
        };

        // Far bands sit lighter and are tinted toward the wash; the near ones
        // carry the accent. Two swatches from one tone, no second source.
        const colour = depth > 0.5 ? palette.soft : shade(palette.tone, palette.dark ? 0.1 : -0.1);
        const strength = (palette.dark ? 0.1 : 0.085) * (1 - depth * 0.55) * intro * alpha;

        crest();
        ctx.lineTo(width + 2, height + 2);
        ctx.lineTo(-2, height + 2);
        ctx.closePath();
        ctx.fillStyle = rgba(colour, clamp01(strength));
        ctx.fill();

        // A single bright edge on the crest. Without it the fills merge into one
        // soft mass and the layering is lost. It brightens in a gust, which is
        // what makes the wind visible rather than merely present.
        crest();
        ctx.strokeStyle = rgba(
          palette.tone,
          clamp01((0.16 + wind * 0.1) * (1 - depth) * intro * alpha),
        );
        ctx.lineWidth = 1;
        ctx.stroke();

        index += 1;
      }
    },
  };
}
