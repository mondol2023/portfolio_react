import { approach, between, clamp01, easeOutCubic, falloff } from "../engine/math";
import { createNoise1, fbm1 } from "../engine/noise";
import type { Scene } from "../engine/scene";
import { rgba, shade } from "../engine/tone-color";

/**
 * Stalks growing up out of the bottom edge, swaying.
 *
 * Strictly vertical motion — the counterpart to `waveBand`'s strictly horizontal
 * one. Placement is biased so the field thickens away from the text column
 * rather than growing straight through it.
 *
 * **Its interaction is parting.** Stalks near the pointer bend away from it and
 * spring back once it has passed, like walking a hand through long grass. The
 * spring is per stalk and time-based, so the field recovers as a ripple in the
 * pointer's wake rather than snapping back the instant the cursor leaves.
 */
export interface StalkFieldOptions {
  count?: number;
  /**
   * Exponent on the placement random. 1 is uniform; below 1 crowds stalks toward
   * the right edge, above 1 toward the left. `about` uses 0.65 because its copy
   * sits left.
   */
  bias?: number;
  /** Tallest a stalk gets, as a fraction of viewport height. */
  reach?: number;
  /** Horizontal travel at the tip, in CSS px. */
  sway?: number;
  speed?: number;
  alpha?: number;
  /** How far the pointer reaches, as a fraction of the viewport's smaller side. */
  reachRadius?: number;
  /** Hardest a stalk is pushed aside, in CSS px. */
  push?: number;
}

interface Stalk {
  x: number;
  height: number;
  phase: number;
  rate: number;
  /** Fraction of the intro elapsed before this one starts growing. */
  delay: number;
  width: number;
  bud: number;
  /** Its own sway stream — a field of stalks on one shared noise moves as a mat. */
  wander: (x: number) => number;
  /** Current displacement from the pointer, in px. Eased toward the target every
   *  frame, which is what gives the spring-back its weight. */
  bend: number;
}

export function stalkField(options: StalkFieldOptions = {}): Scene {
  const {
    count = 34,
    bias = 1,
    reach = 0.55,
    sway = 26,
    speed = 0.5,
    alpha = 1,
    reachRadius = 0.22,
    push = 34,
  } = options;

  let stalks: Stalk[] = [];
  let width = 0;
  let height = 0;

  function seed() {
    stalks = Array.from({ length: count }, (_, i) => ({
      x: Math.pow((i + between(0.1, 0.9)) / count, bias),
      height: between(0.35, 1),
      phase: between(0, Math.PI * 2),
      rate: between(0.7, 1.35),
      // Staggered so the field comes up as a ripple rather than all at once.
      delay: between(0, 0.55),
      width: between(1, 2.2),
      bud: between(1.6, 3.4),
      wander: createNoise1(),
      bend: 0,
    }));
  }

  return {
    resize(nextWidth, nextHeight) {
      const first = width === 0;
      width = nextWidth;
      height = nextHeight;
      // Re-seeded only on the first sizing: a browser resize should not shuffle
      // a field the reader is already looking at.
      if (first) seed();
    },

    frame({ ctx, dt, t, intro, palette, pointer }) {
      const tip = shade(palette.tone, palette.dark ? 0.25 : -0.15);
      const radius = Math.min(width, height) * reachRadius;

      for (const stalk of stalks) {
        const grown = easeOutCubic(clamp01((intro - stalk.delay) / (1 - stalk.delay)));
        if (grown <= 0) continue;

        const x = width * stalk.x;
        const top = height - height * reach * stalk.height * grown;

        // Only stalks the pointer is actually among react — the vertical term
        // means a cursor up in the heading does not mow the grass at the fold.
        const near = falloff(Math.abs(x - pointer.x), radius);
        const vertical = falloff(Math.max(0, top - pointer.y), height * 0.5);
        const direction = x >= pointer.x ? 1 : -1;
        const target = direction * near * vertical * push * pointer.presence;

        // Asymmetric: pushed aside quickly, released slowly. A symmetric spring
        // reads as elastic; grass does not.
        const parting = Math.abs(target) > Math.abs(stalk.bend);
        stalk.bend = approach(stalk.bend, target, parting ? 0.12 : 0.55, dt);

        const lean =
          fbm1(stalk.wander, t * speed * stalk.rate * 0.5 + stalk.phase) * sway * grown +
          stalk.bend * grown;

        // Quadratic, with the control point at half height: the bend loads near
        // the top the way a real stem does, instead of pivoting at the base.
        ctx.beginPath();
        ctx.moveTo(x, height + 2);
        ctx.quadraticCurveTo(x + lean * 0.35, (height + top) / 2, x + lean, top);

        ctx.strokeStyle = rgba(palette.tone, clamp01(0.2 * grown * alpha));
        ctx.lineWidth = stalk.width;
        ctx.lineCap = "round";
        ctx.stroke();

        // The bud brightens as it is disturbed. Without it the parting is only
        // legible as shape, which at this opacity is nearly not at all.
        ctx.beginPath();
        ctx.arc(x + lean, top, stalk.bud * grown * (1 + near * vertical * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = rgba(tip, clamp01((0.45 + near * vertical * 0.35) * grown * alpha));
        ctx.fill();
      }
    },
  };
}
