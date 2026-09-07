/**
 * The height field — the one piece of maths both halves of the scene run.
 *
 * The GPU needs it to shade the water (a normal per pixel, sixty times a
 * second); the CPU needs it to float things on that water (where exactly is
 * the surface under this boat, and which way is it tilted). If the two ever
 * disagreed, boats would sit in the air or sink through a crest — the single
 * most obvious way for a scene like this to look fake.
 *
 * So there is one table of waves, and the GLSL is *generated from it* rather
 * than written out a second time by hand. Change an amplitude here and the
 * shader changes with it; there is no second place to forget.
 */

export interface Wave {
  /** Unit direction the crest lines travel along. */
  dir: readonly [number, number];
  /** Crests per world unit. */
  freq: number;
  /** Half the crest-to-trough height, in world units. */
  amp: number;
  /** Radians per second — larger is a faster-moving, choppier wave. */
  speed: number;
}

/**
 * Four waves, roughly an octave apart and deliberately not parallel.
 *
 * Parallel waves of different frequencies read as corduroy; crossing them at
 * awkward angles is what produces the wandering, non-repeating interference a
 * real river surface has. Amplitude falls off with frequency the way a real
 * spectrum does, so the big slow swell carries the boats and the fast small
 * ripples only catch the light.
 */
export const WAVES: readonly Wave[] = [
  { dir: [0.92, 0.39], freq: 0.62, amp: 0.075, speed: 1.05 },
  { dir: [-0.45, 0.89], freq: 1.13, amp: 0.045, speed: 1.55 },
  { dir: [0.31, -0.95], freq: 2.05, amp: 0.026, speed: 2.1 },
  { dir: [-0.88, -0.47], freq: 3.6, amp: 0.013, speed: 2.95 },
];

/**
 * How many pointer-made ripples can be alive at once.
 *
 * Fixed because it is a shader uniform array, and GLSL ES 1.00 array sizes
 * must be compile-time constants. Eight is enough that a fast scribble across
 * the water never visibly runs out; the oldest is recycled beyond that.
 */
export const MAX_RIPPLES = 8;

/** World units per second the ring travels outward. */
export const RIPPLE_SPEED = 2.6;
/** Seconds until a ripple has decayed to nothing and its slot can be reused. */
export const RIPPLE_LIFE = 4.2;

export interface Ripple {
  x: number;
  z: number;
  /** Seconds since it was spawned. */
  age: number;
  /** 0..1 — a tap makes a small one, a drag-wake smaller still. */
  strength: number;
}

/** Wind-driven swell only. `wind` scales the whole spectrum: 1 is a calm day. */
export function waveHeight(x: number, z: number, time: number, wind: number): number {
  let h = 0;
  for (const wave of WAVES) {
    h += wave.amp * Math.sin((x * wave.dir[0] + z * wave.dir[1]) * wave.freq + time * wave.speed);
  }
  return h * wind;
}

/**
 * One ripple's contribution: a travelling ring, not a growing bump.
 *
 * `exp(-|d - front|)` is the ring itself — energy concentrated at the wave
 * front and nowhere else — and the second exponential is the ring fading as it
 * spreads. Drop either and you get a pulsing disc, which is what a ripple
 * looks like when someone has only modelled the timing and not the shape.
 */
export function rippleHeight(x: number, z: number, ripples: readonly Ripple[]): number {
  let h = 0;

  for (const ripple of ripples) {
    if (ripple.age >= RIPPLE_LIFE) continue;
    const d = Math.hypot(x - ripple.x, z - ripple.z);
    const front = ripple.age * RIPPLE_SPEED;
    const ring = Math.exp(-Math.abs(d - front) * 1.6) * Math.exp(-ripple.age * 0.95);
    h += Math.sin((d - front) * 9) * 0.055 * ring * ripple.strength;
  }

  return h;
}

/** The full surface: swell plus whatever the reader has just poked into it. */
export function waterHeight(
  x: number,
  z: number,
  time: number,
  wind: number,
  ripples: readonly Ripple[],
): number {
  return waveHeight(x, z, time, wind) + rippleHeight(x, z, ripples);
}

/**
 * Surface slope, by central difference.
 *
 * Analytic derivatives would be cheaper, but the ripple term's derivative is
 * long enough to get subtly wrong, and this runs a few dozen times a frame
 * (once per floating object) rather than a few million. Correctness is worth
 * more than the cycles here.
 */
export function waterSlope(
  x: number,
  z: number,
  time: number,
  wind: number,
  ripples: readonly Ripple[],
): { dx: number; dz: number } {
  const e = 0.12;
  return {
    dx:
      (waterHeight(x + e, z, time, wind, ripples) - waterHeight(x - e, z, time, wind, ripples)) /
      (2 * e),
    dz:
      (waterHeight(x, z + e, time, wind, ripples) - waterHeight(x, z - e, time, wind, ripples)) /
      (2 * e),
  };
}

/** Numbers into GLSL float literals — `1` is an int there and will not compile. */
function f(value: number): string {
  return Number.isInteger(value) ? `${value}.0` : String(value);
}

/**
 * The same height field, as shader source.
 *
 * Generated rather than authored: the wave loop is unrolled into straight
 * additions (no `for`, no array indexing) because every term is known at build
 * time, which is both faster on the GPU and impossible to desynchronise from
 * the table above.
 */
export const WATER_GLSL = `
uniform vec4 uRipples[${MAX_RIPPLES}];
uniform float uWind;

float lr_swell(vec2 p, float t) {
  float h = 0.0;
${WAVES.map(
  (w) =>
    `  h += ${f(w.amp)} * sin(dot(p, vec2(${f(w.dir[0])}, ${f(w.dir[1])})) * ${f(w.freq)} + t * ${f(w.speed)});`,
).join("\n")}
  return h * uWind;
}

float lr_ripples(vec2 p) {
  float h = 0.0;

  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 r = uRipples[i];
    if (r.w <= 0.0) continue;

    float d = distance(p, r.xy);
    float front = r.z * ${f(RIPPLE_SPEED)};
    float ring = exp(-abs(d - front) * 1.6) * exp(-r.z * 0.95);
    h += sin((d - front) * 9.0) * 0.055 * ring * r.w;
  }

  return h;
}

float lr_height(vec2 p, float t) {
  return lr_swell(p, t) + lr_ripples(p);
}

/*
 * Normal by central difference, with the sample spacing passed in: close to
 * the camera a tight epsilon resolves every small ripple, but at the horizon
 * one pixel spans many wavelengths and the same epsilon aliases into noise.
 * The caller widens it with distance, which is a cheap stand-in for the
 * mip-mapping a texture-based ocean would get for free.
 */
vec3 lr_normal(vec2 p, float t, float e) {
  float hx = lr_height(p + vec2(e, 0.0), t) - lr_height(p - vec2(e, 0.0), t);
  float hz = lr_height(p + vec2(0.0, e), t) - lr_height(p - vec2(0.0, e), t);
  return normalize(vec3(-hx, 2.0 * e, -hz));
}
`;
