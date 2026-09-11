/**
 * Value noise, small enough to justify hand-rolling.
 *
 * Everything in the first pass of this feature swayed on a sine. One sine is
 * fine; six of them on screen at once read as machinery, because a sine repeats
 * exactly and the eye is very good at spotting that. Noise gives the same gentle
 * motion without a period to lock onto — the difference between a flag moving
 * and a flag being animated.
 *
 * It is value noise rather than Perlin/simplex: cheaper, and the smoother
 * gradient of the alternatives buys nothing at the amplitudes used here. No new
 * dependency, which is the standing rule for this codebase.
 */

/** Integer hash → `[0, 1)`. `Math.imul` keeps the multiply in 32-bit, which is
 *  both faster and the only way the mixing constants behave as intended. */
function hash(i: number, seed: number): number {
  let h = Math.imul(i + seed, 374761393);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** Hermite fade. Straight linear interpolation between lattice points leaves a
 *  visible kink every whole number. */
function fade(f: number): number {
  return f * f * (3 - 2 * f);
}

export type Noise1 = (x: number) => number;
export type Noise2 = (x: number, y: number) => number;

function randomSeed(): number {
  return (Math.random() * 0x7fffffff) | 0;
}

/** One dimension, output in `[-1, 1]`. The workhorse: anything that used to be
 *  `Math.sin(t * rate + phase)` becomes this. */
export function createNoise1(seed: number = randomSeed()): Noise1 {
  return (x) => {
    const i = Math.floor(x);
    const f = fade(x - i);
    const a = hash(i, seed);
    const b = hash(i + 1, seed);
    return (a + (b - a) * f) * 2 - 1;
  };
}

/** Two dimensions, output in `[-1, 1]`. Used where a *field* is wanted — a
 *  particle's wander should depend on where it is, not only on the clock, or
 *  the whole field drifts as one body. */
export function createNoise2(seed: number = randomSeed()): Noise2 {
  return (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = fade(x - ix);
    const fy = fade(y - iy);

    // Each row is a 1D noise with the row index folded into the seed, so the two
    // axes decorrelate without a second hash function.
    const row = (j: number) => {
      const s = seed + j * 15731;
      const a = hash(ix, s);
      const b = hash(ix + 1, s);
      return a + (b - a) * fx;
    };

    const top = row(iy);
    const bottom = row(iy + 1);
    return (top + (bottom - top) * fy) * 2 - 1;
  };
}

/**
 * Two octaves of `noise`, still in `[-1, 1]`.
 *
 * A single octave is smooth to the point of being bland at these speeds. The
 * second one — roughly twice the frequency, offset so it does not line up — adds
 * the small irregularities that make the motion look observed rather than
 * generated. Two is the whole budget: a third is not visible at this scale.
 */
export function fbm1(noise: Noise1, x: number): number {
  return noise(x) * 0.65 + noise(x * 2.17 + 11.3) * 0.35;
}
