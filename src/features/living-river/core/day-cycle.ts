import { TAU, clamp01, smoothstep } from "./num";

/**
 * The scene's clock, expressed as colour and light direction.
 *
 * One number — `phase`, a fraction of a full day — decides everything the
 * shader needs to know about the time of day: where the sun is, how bright it
 * is, what the sky and the water are made of. The scroll position drives that
 * number (see `world.ts`), so a reader moving down the page moves the sun
 * across the sky rather than fading between two fixed pictures.
 *
 * Phase runs sunrise (0) → noon (0.25) → sunset (0.5) → midnight (0.75) and
 * wraps, which is exactly the period of `sin(phase * TAU)`. That is not a
 * coincidence: the sun's altitude *is* that sine, so the colour keyframes
 * below and the geometry below them stay in step for free, with no second
 * table of "which stage are we in" to keep correct.
 */

export type RGB = readonly [number, number, number];

/** `#rrggbb` → linear-ish 0..1 triple. Parsed once, at module load. */
function rgb(hex: string): RGB {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

interface DayStop {
  /** Where on the 0..1 day this stop sits. */
  at: number;
  /** Straight up. */
  zenith: RGB;
  /** Where the sky meets the water. */
  horizon: RGB;
  /** Sun disc, its glow, and the glitter path it lays on the water. */
  sunTint: RGB;
  /** Water far from the camera. */
  waterDeep: RGB;
  /** Water just in front of the camera. */
  waterShallow: RGB;
  /** What distance dissolves into — the haze band along the horizon. */
  fog: RGB;
  cloudTint: RGB;
  /** 0 = a clear sky, 1 = overcast. */
  cloudDensity: number;
}

/*
 * A Bengali river read hour by hour: the amber of a Padma sunrise, the hard
 * blue-white of noon, the rust of a monsoon sunset, and a night that keeps a
 * little violet in it rather than going to black — a river at night is never
 * actually black, and a pure-black backdrop would read as "the effect broke".
 */
const STOPS: readonly DayStop[] = [
  {
    at: 0,
    zenith: rgb("#2c3f6b"),
    horizon: rgb("#f2a25c"),
    sunTint: rgb("#ffbe7a"),
    waterDeep: rgb("#1d2b47"),
    waterShallow: rgb("#43587e"),
    fog: rgb("#c8956a"),
    cloudTint: rgb("#ffcfa0"),
    cloudDensity: 0.55,
  },
  {
    at: 0.14,
    zenith: rgb("#3f7fc4"),
    horizon: rgb("#bcd9ee"),
    sunTint: rgb("#fff2d0"),
    waterDeep: rgb("#16405f"),
    waterShallow: rgb("#3f7ea3"),
    fog: rgb("#b9d3e4"),
    cloudTint: rgb("#ffffff"),
    cloudDensity: 0.4,
  },
  {
    at: 0.27,
    zenith: rgb("#2f74c8"),
    horizon: rgb("#cfe6f5"),
    sunTint: rgb("#ffffff"),
    waterDeep: rgb("#12405f"),
    waterShallow: rgb("#4d92b0"),
    fog: rgb("#cfe3ef"),
    cloudTint: rgb("#ffffff"),
    cloudDensity: 0.32,
  },
  {
    at: 0.42,
    zenith: rgb("#4a7fb8"),
    horizon: rgb("#f3c98a"),
    sunTint: rgb("#ffd9a0"),
    waterDeep: rgb("#1c3f56"),
    waterShallow: rgb("#6b8f9c"),
    fog: rgb("#e6c79b"),
    cloudTint: rgb("#ffe0b8"),
    cloudDensity: 0.45,
  },
  {
    at: 0.52,
    zenith: rgb("#4a4a86"),
    horizon: rgb("#e8703a"),
    sunTint: rgb("#ff9d4d"),
    waterDeep: rgb("#23253f"),
    waterShallow: rgb("#7a5570"),
    fog: rgb("#d97a48"),
    cloudTint: rgb("#ff9e63"),
    cloudDensity: 0.6,
  },
  {
    at: 0.62,
    zenith: rgb("#24284f"),
    horizon: rgb("#a04a6b"),
    sunTint: rgb("#d9708a"),
    waterDeep: rgb("#141733"),
    waterShallow: rgb("#3a3358"),
    fog: rgb("#7c4a63"),
    cloudTint: rgb("#8a5570"),
    cloudDensity: 0.5,
  },
  {
    at: 0.76,
    zenith: rgb("#070a1c"),
    horizon: rgb("#17203f"),
    sunTint: rgb("#2a3560"),
    waterDeep: rgb("#04060f"),
    waterShallow: rgb("#0d1428"),
    fog: rgb("#131b34"),
    cloudTint: rgb("#1a2340"),
    cloudDensity: 0.35,
  },
  {
    at: 0.92,
    zenith: rgb("#131a3b"),
    horizon: rgb("#4a4066"),
    sunTint: rgb("#6b5a86"),
    waterDeep: rgb("#0a0e20"),
    waterShallow: rgb("#1d2440"),
    fog: rgb("#3b3556"),
    cloudTint: rgb("#4a4468"),
    cloudDensity: 0.45,
  },
];

export interface SkyState {
  zenith: RGB;
  horizon: RGB;
  sunTint: RGB;
  waterDeep: RGB;
  waterShallow: RGB;
  fog: RGB;
  cloudTint: RGB;
  cloudDensity: number;
  /** Unit vector toward the sun, in world space. */
  sunDir: readonly [number, number, number];
  /** Unit vector toward the moon — the sun's antipode, so it rises as the sun sets. */
  moonDir: readonly [number, number, number];
  /** 1 while the sun is clear of the horizon, 0 once it has set. */
  sunUp: number;
  /** 1 at full dark. Gates the stars, the fireflies, and the moon's glitter path. */
  night: number;
}

/** Phase distance from each stop to the next, wrapping past midnight. */
const WIDTHS: readonly number[] = STOPS.map((stop, i) => {
  const next = STOPS[(i + 1) % STOPS.length] as DayStop;
  return (next.at - stop.at + 1) % 1;
});

/** The stop `offset` places along from `i`, wrapping round the day. */
function at(i: number, offset: number): DayStop {
  const n = STOPS.length;
  return STOPS[(((i + offset) % n) + n) % n] as DayStop;
}

/** The width of the segment `offset` places along from `i`, wrapping likewise. */
function width(i: number, offset: number): number {
  const n = WIDTHS.length;
  return WIDTHS[(((i + offset) % n) + n) % n] as number;
}

/**
 * One channel across one segment, as a cubic Hermite through four keyframes.
 *
 * Straight lerping between stops is continuous but not smooth: the *rate* of
 * colour change jumps at every keyframe. On a small swatch nobody would ever
 * see it. On a sky filling the whole viewport, moving continuously, it reads
 * as the light hesitating on the hour — a stutter with no cause, which is
 * exactly the kind of thing that makes a generated scene feel generated.
 *
 * The tangents are measured in value-per-*phase* from the neighbours either
 * side, then rescaled into this segment's own 0..1 parameter by multiplying by
 * its width. Skipping that rescale gives the textbook uniform Catmull-Rom,
 * which is only smooth when every segment is the same length. These are not —
 * dawn gets 0.14 of the day and the last leg to sunrise gets 0.08 — so the
 * uniform form would leave a kink at every stop, which is precisely the defect
 * this exists to remove.
 */
function hermite(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  before: number,
  here: number,
  after: number,
  u: number,
): number {
  const m1 = ((p2 - p0) / (before + here)) * here;
  const m2 = ((p3 - p1) / (here + after)) * here;

  const u2 = u * u;
  const u3 = u2 * u;

  return (
    (2 * u3 - 3 * u2 + 1) * p1 +
    (u3 - 2 * u2 + u) * m1 +
    (-2 * u3 + 3 * u2) * p2 +
    (u3 - u2) * m2
  );
}

/**
 * The same curve on three channels.
 *
 * Clamped, because a Hermite through four points overshoots by design — that
 * overshoot is what keeps a spline from looking like an average, and it is
 * welcome in the middle of the range where it deepens a sunset. Past 1 it is
 * not an overshoot, it is a clipped channel, and a clipped red on an amber
 * horizon turns it pink.
 */
function curveRgb(
  a: RGB,
  b: RGB,
  c: RGB,
  d: RGB,
  before: number,
  here: number,
  after: number,
  u: number,
): RGB {
  return [
    clamp01(hermite(a[0], b[0], c[0], d[0], before, here, after, u)),
    clamp01(hermite(a[1], b[1], c[1], d[1], before, here, after, u)),
    clamp01(hermite(a[2], b[2], c[2], d[2], before, here, after, u)),
  ];
}

/**
 * The keyframe `phase` sits on, and how far past it we are.
 *
 * Returns the *index* rather than the stop itself, because the spline needs
 * the two neighbours either side as well and the list wraps: past the last
 * stop the search continues at the first one a day later, so midnight →
 * sunrise is a segment like any other instead of a place where the sky snaps.
 */
function bracket(phase: number): { i: number; t: number } {
  for (let i = 0; i < STOPS.length - 1; i += 1) {
    const a = STOPS[i] as DayStop;
    const b = STOPS[i + 1] as DayStop;
    if (phase >= a.at && phase < b.at) {
      return { i, t: (phase - a.at) / (b.at - a.at) };
    }
  }

  // Past the final stop (or before the first, which cannot happen for a
  // fraction): the wrap-around segment back to sunrise.
  const i = STOPS.length - 1;
  const last = STOPS[i] as DayStop;
  const span = width(i, 0);
  const travelled = phase >= last.at ? phase - last.at : 1 - last.at + phase;
  return { i, t: travelled / span };
}

/** Everything the renderers need about this instant of the day. */
export function sampleDayCycle(phase: number): SkyState {
  const p = phase - Math.floor(phase);
  const { i, t } = bracket(p);

  // The segment being crossed, plus a neighbour either side to give the spline
  // its tangents. All four wrap, so there is no seam at midnight.
  const s0 = at(i, -1);
  const a = at(i, 0);
  const b = at(i, 1);
  const s3 = at(i, 2);

  // …and the three segment widths those tangents have to be scaled by.
  const before = width(i, -1);
  const here = width(i, 0);
  const after = width(i, 1);

  /*
   * Altitude and azimuth from the same angle the keyframes are indexed by, so
   * the light direction can never disagree with the colours: at phase 0 the
   * sun is on the horizon to the right, at 0.25 overhead, at 0.5 on the
   * horizon to the left, and below it from there to sunrise.
   */
  const angle = p * TAU;
  const altitude = Math.sin(angle);
  const azimuth = Math.cos(angle);

  // Biased toward +Z (the direction the camera looks) so the sun stays in
  // frame rather than sweeping out of view behind the reader.
  const sx = azimuth * 0.9;
  const sy = altitude;
  const sz = 0.85;
  const len = Math.hypot(sx, sy, sz);

  return {
    zenith: curveRgb(s0.zenith, a.zenith, b.zenith, s3.zenith, before, here, after, t),
    horizon: curveRgb(s0.horizon, a.horizon, b.horizon, s3.horizon, before, here, after, t),
    sunTint: curveRgb(s0.sunTint, a.sunTint, b.sunTint, s3.sunTint, before, here, after, t),
    waterDeep: curveRgb(s0.waterDeep, a.waterDeep, b.waterDeep, s3.waterDeep, before, here, after, t),
    waterShallow: curveRgb(s0.waterShallow, a.waterShallow, b.waterShallow, s3.waterShallow, before, here, after, t),
    fog: curveRgb(s0.fog, a.fog, b.fog, s3.fog, before, here, after, t),
    cloudTint: curveRgb(s0.cloudTint, a.cloudTint, b.cloudTint, s3.cloudTint, before, here, after, t),
    cloudDensity: clamp01(
      hermite(
        s0.cloudDensity,
        a.cloudDensity,
        b.cloudDensity,
        s3.cloudDensity,
        before,
        here,
        after,
        t,
      ),
    ),
    sunDir: [sx / len, sy / len, sz / len],
    // Mirrored through the horizon rather than fully negated: the moon should
    // cross the same part of the sky the sun does, not the sky behind us.
    moonDir: [-sx / len, -sy / len, sz / len],
    sunUp: smoothstep(-0.08, 0.05, altitude),
    night: clamp01(smoothstep(0.04, -0.16, altitude)),
  };
}
